"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Building2,
  ClipboardList,
  Download,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Settings,
  Store,
  Trees,
  Warehouse,
  Images,
  LifeBuoy,
  X,
  Smartphone,
  CircleDollarSign,
  UserPlus,
  Palette,
} from "lucide-react";
import { isStaffRole, isAdminRole } from "@magaza/shared";
import type { UserRole } from "@magaza/shared";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { DeveloperFooter } from "@/components/developer-footer";
import { NotificationBell } from "@/components/notification-bell";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/inventory", label: "Envanter", icon: Warehouse },
  { href: "/admin/catalog", label: "Kampanya Katalog", icon: Package },
  { href: "/admin/stores", label: "Mağazalar", icon: Store },
  { href: "/admin/registrations", label: "Kayıt Talepleri", icon: UserPlus },
  { href: "/admin/announcements", label: "Duyurular", icon: Megaphone },
  { href: "/admin/ad-expenses", label: "Reklam Giderleri", icon: CircleDollarSign },
  { href: "/admin/media", label: "Görsel Kütüphanesi", icon: Images },
  { href: "/admin/support", label: "Destek", icon: LifeBuoy },
  { href: "/admin/definitions", label: "Tanımlar", icon: Settings },
  { href: "/admin/requests", label: "Talepler", icon: ClipboardList },
  { href: "/admin/export", label: "Excel Export", icon: Download },
  { href: "/admin/mobile-app", label: "Mobil Uygulama", icon: Smartphone },
  { href: "/admin/branding", label: "Uygulama Logosu", icon: Palette },
];

const storeNav: NavItem[] = [
  { href: "/store", label: "Dashboard", icon: LayoutDashboard },
  { href: "/store/avm", label: "AVM Alanları", icon: Building2 },
  { href: "/store/outdoor", label: "Açık Hava", icon: Trees },
  { href: "/store/signage", label: "Mağaza İçi", icon: ImageIcon },
  { href: "/store/catalog", label: "Kampanya Adetleri", icon: Package },
  { href: "/store/announcements", label: "Duyurular", icon: Megaphone },
  { href: "/store/ad-expenses", label: "Reklam Giderleri", icon: CircleDollarSign },
  { href: "/store/support", label: "Destek", icon: LifeBuoy },
  { href: "/store/requests", label: "Değişim Talepleri", icon: ClipboardList },
];

function NavLinks({
  nav,
  pathname,
  onNavigate,
  variant = "desktop",
}: {
  nav: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
}) {
  return (
    <>
      {nav.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/admin" && item.href !== "/store" && pathname.startsWith(item.href));
        const Icon = item.icon;
        const isDesktop = variant === "desktop";
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isDesktop
                ? active
                  ? "bg-primary text-primary-foreground"
                  : "text-[hsl(var(--sidebar-muted))] hover:bg-white/10 hover:text-[hsl(var(--sidebar-foreground))]"
                : active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function DashboardLayout({
  children,
  role,
  displayName,
}: {
  children: React.ReactNode;
  role: UserRole;
  displayName: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = isStaffRole(role)
    ? adminNav.filter((item) => item.href !== "/admin/branding" || isAdminRole(role))
    : storeNav;
  const panelTitle =
    role === "MANAGER" ? "Müdür Paneli" : role === "ADMIN" ? "Yönetici Paneli" : "Mağaza Paneli";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside
          className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col lg:flex"
          style={{ background: "hsl(var(--sidebar))", color: "hsl(var(--sidebar-foreground))" }}
        >
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
              <BrandLogo
                className="h-10 w-10 shrink-0"
                fallbackClassName="bg-white/10 text-white text-lg font-bold"
                size={40}
              />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--sidebar-muted))]">
                  Mağaza Platform
                </div>
                <h1 className="mt-0.5 truncate text-lg font-semibold">{panelTitle}</h1>
              </div>
            </div>
            <p className="mt-2 truncate text-sm text-[hsl(var(--sidebar-muted))]">
              {displayName}
            </p>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
            <NavLinks nav={nav} pathname={pathname} variant="desktop" />
          </nav>
          <div className="border-t border-white/10 p-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-[hsl(var(--sidebar-muted))] hover:bg-white/10 hover:text-[hsl(var(--sidebar-foreground))]"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" /> Çıkış Yap
            </Button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b bg-card/95 px-4 backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <span className="hidden text-sm font-medium text-muted-foreground lg:inline">{panelTitle}</span>
            </div>
            <NotificationBell />
          </header>

          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto flex min-h-full max-w-6xl flex-col">
              <div className="flex-1">{children}</div>
              <DeveloperFooter className="mt-10" />
            </div>
          </div>
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-4">
              <span className="font-semibold">{panelTitle}</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
              <NavLinks nav={nav} pathname={pathname} onNavigate={() => setMobileOpen(false)} variant="mobile" />
            </nav>
            <div className="border-t p-3">
              <Button variant="outline" className="w-full" onClick={() => signOut({ callbackUrl: "/login" })}>
                Çıkış
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
