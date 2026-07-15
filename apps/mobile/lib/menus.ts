export type MenuItem = { href: string; label: string };

export const STORE_MENU: MenuItem[] = [
  { href: "/store", label: "Ana Sayfa" },
  { href: "/store/inventory", label: "Envanter Özeti" },
  { href: "/store/avm", label: "AVM Alanları" },
  { href: "/store/outdoor", label: "Açık Hava" },
  { href: "/store/signage", label: "Mağaza İçi" },
  { href: "/store/catalog", label: "Ürün Talepleri" },
  { href: "/store/announcements", label: "Duyurular" },
  { href: "/store/ad-expenses", label: "Reklam Giderleri" },
  { href: "/store/support", label: "Destek" },
  { href: "/store/requests", label: "Değişim Talepleri" },
  { href: "/notifications", label: "Bildirimler" },
];

export const ADMIN_MENU: MenuItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/inventory", label: "Envanter" },
  { href: "/admin/catalog", label: "Ürün Kataloğu" },
  { href: "/admin/stores", label: "Mağazalar" },
  { href: "/admin/announcements", label: "Duyurular" },
  { href: "/admin/ad-expenses", label: "Reklam Giderleri" },
  { href: "/admin/media", label: "Görsel Kütüphanesi" },
  { href: "/admin/support", label: "Destek" },
  { href: "/admin/definitions", label: "Tanımlar" },
  { href: "/admin/requests", label: "Talepler" },
  { href: "/admin/export", label: "Excel Export" },
  { href: "/admin/mobile-app", label: "Mobil Uygulama" },
  { href: "/notifications", label: "Bildirimler" },
];
