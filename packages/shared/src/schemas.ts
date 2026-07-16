import { z } from "zod";
import { AVM_VITRIN_KINDS, CHANGE_REQUEST_STATUSES, CHANGE_TARGET_TYPES, USER_ROLES, CATALOG_ITEM_TYPES } from "./constants";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Kullanıcı adı gerekli"),
  password: z.string().min(1, "Şifre gerekli"),
});

const createStoreBaseSchema = z.object({
  name: z.string().min(1, "Mağaza adı gerekli"),
  storeNumber: z.string().trim().min(1, "Mağaza numarası gerekli"),
  address: z.string().optional(),
  active: z.boolean().default(true),
});

export const createStoreSchema = createStoreBaseSchema.extend({
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter").optional(),
  password: z.string().min(6, "Şifre en az 6 karakter").optional(),
}).superRefine((data, ctx) => {
  const hasUsername = Boolean(data.username);
  const hasPassword = Boolean(data.password);
  if (hasUsername !== hasPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Kullanıcı adı ve şifre birlikte girilmeli",
      path: hasUsername ? ["password"] : ["username"],
    });
  }
});

export const updateStoreSchema = createStoreBaseSchema.partial();

export const createStoreUserSchema = z.object({
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter"),
  password: z.string().min(6, "Şifre en az 6 karakter"),
});

export const registerStoreSchema = z.object({
  storeName: z.string().trim().min(1, "Mağaza adı gerekli"),
  storeNumber: z.string().trim().min(1, "Mağaza numarası gerekli"),
  username: z.string().trim().min(3, "Kullanıcı adı en az 3 karakter"),
  password: z.string().min(6, "Şifre en az 6 karakter"),
});

export const reviewSignupRequestSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  adminNote: z.string().optional().nullable(),
});

export const bulkDeleteIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "En az bir kayıt seçilmeli"),
});

export const createAreaSubTypeSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1, "Ad gerekli"),
  code: z.string().min(1, "Kod gerekli"),
  sortOrder: z.number().int().default(0),
});

export const createPlacementOptionSchema = z.object({
  name: z.string().min(1, "Ad gerekli"),
  code: z.string().min(1, "Kod gerekli"),
  sortOrder: z.number().int().default(0),
});

export const updateAreaSubTypeSchema = z
  .object({
    categoryId: z.string().min(1).optional(),
    name: z.string().min(1, "Ad gerekli").optional(),
    code: z.string().min(1, "Kod gerekli").optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Güncellenecek alan gerekli",
  });

export const updatePlacementOptionSchema = z
  .object({
    name: z.string().min(1, "Ad gerekli").optional(),
    code: z.string().min(1, "Kod gerekli").optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Güncellenecek alan gerekli",
  });

export const avmVitrinSchema = z
  .object({
    kind: z.enum(AVM_VITRIN_KINDS).default("VITRIN"),
    siraNo: z.number().int().min(1),
    en: z.number().positive("En pozitif olmalı"),
    boy: z.number().positive("Boy pozitif olmalı"),
    camEn: z.number().positive().optional().nullable(),
    camBoy: z.number().positive().optional().nullable(),
    konum: z.string().optional().nullable(),
    gorselUrl: z.string().min(1, "Fotoğraf zorunlu"),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "VITRIN") {
      if (data.konum?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Vitrin için konum girilmez", path: ["konum"] });
      }
    }
    if (data.kind === "EKSTRA_ALAN") {
      if (!data.konum?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ekstra alan için konum zorunlu", path: ["konum"] });
      }
      if (data.camEn != null || data.camBoy != null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ekstra alan için cam ölçüsü girilmez", path: ["camEn"] });
      }
    }
  });

export const avmVideoSchema = z.object({
  placementId: z.string().min(1, "Konum seçin"),
  adet: z.number().int().min(1, "Adet en az 1"),
  en: z.number().positive().optional().nullable(),
  boy: z.number().positive().optional().nullable(),
});

export const createAvmEntrySchema = z.object({
  subTypeId: z.string().min(1),
  note: z.string().optional().nullable(),
  vitrins: z.array(avmVitrinSchema).default([]),
  videos: z.array(avmVideoSchema).default([]),
});

export const outdoorEntrySchema = z.object({
  subTypeId: z.string().min(1, "Tür seçin"),
  en: z.number().positive("En pozitif olmalı"),
  boy: z.number().positive("Boy pozitif olmalı"),
  adet: z.number().int().min(1, "Adet en az 1"),
  note: z.string().optional().nullable(),
  gorselUrl: z.string().optional().nullable(),
});

export const storeSignageEntrySchema = z.object({
  subTypeId: z.string().min(1, "Tür seçin"),
  placementId: z.string().min(1, "Konum seçin"),
  en: z.number().positive("En pozitif olmalı"),
  boy: z.number().positive("Boy pozitif olmalı"),
  adet: z.number().int().min(1, "Adet en az 1").default(1),
  note: z.string().optional().nullable(),
  gorselUrl: z.string().optional().nullable(),
});

export const createChangeRequestSchema = z.object({
  targetType: z.enum(CHANGE_TARGET_TYPES),
  targetId: z.string().min(1),
  note: z.string().optional().nullable(),
});

export const updateChangeRequestStatusSchema = z.object({
  status: z.enum(CHANGE_REQUEST_STATUSES),
  adminNote: z.string().optional().nullable(),
});

export const createCatalogItemSchema = z.object({
  name: z.string().min(1, "Ürün adı gerekli"),
  code: z.string().min(1, "Kod gerekli"),
  type: z.enum(CATALOG_ITEM_TYPES),
  referenceImageUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateCatalogItemSchema = createCatalogItemSchema.partial();

export const createCatalogRequestSchema = z
  .object({
    catalogItemId: z.string().min(1, "Ürün seçin"),
    quantity: z.number().int().min(1).optional().nullable(),
    note: z.string().optional().nullable(),
    storeImageUrl: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // quantity validation done at API with catalog item type
  });

export const updateCatalogRequestStatusSchema = z.object({
  status: z.enum(CHANGE_REQUEST_STATUSES),
  adminNote: z.string().optional().nullable(),
});

export const resetStoreUserPasswordSchema = z.object({
  password: z.string().min(6, "Şifre en az 6 karakter"),
});

export const updateAvmVitrinSchema = z
  .object({
    vitrinId: z.string().min(1),
    kind: z.enum(AVM_VITRIN_KINDS).optional(),
    en: z.number().positive().optional(),
    boy: z.number().positive().optional(),
    camEn: z.number().positive().optional().nullable(),
    camBoy: z.number().positive().optional().nullable(),
    konum: z.string().optional().nullable(),
    gorselUrl: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "VITRIN" && data.konum?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Vitrin için konum girilmez", path: ["konum"] });
    }
    if (data.kind === "EKSTRA_ALAN") {
      if (data.konum !== undefined && !data.konum?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ekstra alan için konum zorunlu", path: ["konum"] });
      }
    }
  });

export const updateOutdoorEntrySchema = outdoorEntrySchema.partial();

export const staffCreateWithStoreSchema = z.object({
  storeId: z.string().min(1, "Mağaza seçin"),
});

export const createSupportTicketSchema = z.object({
  subject: z.string().min(3, "Konu en az 3 karakter"),
  message: z.string().min(10, "Mesaj en az 10 karakter"),
});

export const updateSupportTicketSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  adminNote: z.string().optional().nullable(),
});

export const announcementAttachmentSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  type: z.enum(["wetransfer", "link", "file"]),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter"),
  body: z.string().min(10, "İçerik en az 10 karakter"),
  kind: z.enum(["NORMAL", "KAMPANYA"]).default("NORMAL"),
  audience: z.enum(["ALL_STORES", "SELECTED_STORES"]),
  storeIds: z.array(z.string()).default([]),
  attachments: z.array(announcementAttachmentSchema).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  active: z.boolean().default(true),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const createAdExpenseCategorySchema = z.object({
  name: z.string().min(2, "Kategori adı en az 2 karakter"),
  code: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const updateAdExpenseCategorySchema = createAdExpenseCategorySchema.partial();

export const adExpenseLineSchema = z.object({
  categoryId: z.string().min(1),
  announcementId: z.string().optional().nullable(),
  title: z.string().min(1, "Başlık gerekli"),
  quantity: z.number().int().positive("Adet 1 veya daha fazla olmalı"),
  totalPrice: z.number().positive("Toplam fiyat 0'dan büyük olmalı"),
  expenseDate: z.string().min(1, "Tarih gerekli"),
  note: z.string().optional().nullable(),
});

export const createAdExpensesSchema = z.object({
  items: z.array(adExpenseLineSchema).min(1, "En az bir gider satırı ekleyin"),
});

export const updateAdExpenseSchema = adExpenseLineSchema.partial();

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type CreateAvmEntryInput = z.infer<typeof createAvmEntrySchema>;
export type OutdoorEntryInput = z.infer<typeof outdoorEntrySchema>;
export type StoreSignageEntryInput = z.infer<typeof storeSignageEntrySchema>;
export type CreateChangeRequestInput = z.infer<typeof createChangeRequestSchema>;
export type CreateCatalogItemInput = z.infer<typeof createCatalogItemSchema>;
export type CreateCatalogRequestInput = z.infer<typeof createCatalogRequestSchema>;
