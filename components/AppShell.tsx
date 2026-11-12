"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/components/AuthProvider";

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Beranda & Katalog", shortLabel: "Beranda", icon: "home" },
  {
    href: "/paket",
    label: "Paket & Checkout",
    shortLabel: "Paket",
    icon: "storefront",
  },
  {
    href: "/kebun",
    label: "Kebun Live IoT",
    shortLabel: "Kebun",
    icon: "potted_plant",
    badge: "LIVE",
  },
  {
    href: "/ai-chat",
    label: "Asisten AgriAI",
    shortLabel: "AgriAI",
    icon: "smart_toy",
  },
  {
    href: "/profil",
    label: "Profil & Pengaturan",
    shortLabel: "Profil",
    icon: "shield_person",
  },
];

function getHeaderTitle(pathname: string): string {
  if (pathname === "/") return "Landing Paket";
  if (pathname.startsWith("/paket")) return "Paket & Checkout";
  if (pathname.startsWith("/kebun")) return "Kebun Live IoT";
  if (pathname.startsWith("/ai-chat")) return "WawanAI Asisten";
  if (pathname.startsWith("/admin")) return "Super Admin Root";
  if (pathname.startsWith("/profil")) return "Profil & CRM";
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return "Autentikasi Akun";
  }
  return "Smart Agri-CRM";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isSuperAdmin, cartItemCount, signOut } = useAuth();

  const navItems = React.useMemo(() => {
    if (!isSuperAdmin) return NAV_ITEMS;
    return [
      ...NAV_ITEMS,
      {
        href: "/admin",
        label: "Panel Super Admin",
        shortLabel: "Admin",
        icon: "admin_panel_settings",
        badge: "ROOT",
      },
    ];
  }, [isSuperAdmin]);

  const screenTitle = getHeaderTitle(pathname);
  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Tamu Kebun";

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface relative selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Ambient Stitch Luminous Emerald Orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 lg:w-[34rem] lg:h-[34rem] bg-primary-fixed-dim/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 lg:w-[28rem] lg:h-[28rem] bg-secondary-fixed/25 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -left-20 w-80 h-80 lg:w-[26rem] lg:h-[26rem] bg-surface-container-high/45 rounded-full blur-3xl" />
      </div>

      {/* DESKTOP LEFT SIDEBAR (>= 1024px) */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 z-40 p-4">
        <div className="glass-card-elevated rounded-3xl h-full flex flex-col justify-between p-5 overflow-y-auto">
          <div className="flex flex-col gap-6">
            {/* Brand Header */}
            <Link href="/" className="flex items-center gap-3 group">
              <BrandLogo size={44} />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  WawanFarm
                </span>
                <span className="text-[17px] font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                  Smart Agri-CRM
                </span>
              </div>
            </Link>

            {/* User / Member Status Card */}
            <div className="rounded-2xl bg-surface-container-low/75 p-3.5 border border-white/80">
              {user ? (
                <div className="flex items-center gap-3">
                  <img
                    src="/images/avatar.jpg"
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[14px] font-bold text-on-surface truncate">
                        {displayName}
                      </p>
                      {isSuperAdmin && (
                        <span className="px-1.5 py-0.5 rounded-full bg-primary text-on-primary text-[9px] font-bold uppercase">
                          Root
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-primary truncate">
                      {isSuperAdmin
                        ? "Super Admin WawanFarm"
                        : profile?.active_package || "Belum ada paket aktif"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[12px] text-on-surface-variant font-medium">
                    Masuk untuk kelola profil, langganan & pesanan Anda.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      className="text-center py-2 rounded-xl bg-primary text-on-primary text-[12px] font-semibold hover:bg-primary-container transition-colors"
                    >
                      Masuk
                    </Link>
                    <Link
                      href="/register"
                      className="text-center py-2 rounded-xl bg-white/80 text-primary text-[12px] font-semibold hover:bg-white transition-colors"
                    >
                      Daftar
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Navigation */}
            <nav className="flex flex-col gap-1.5" aria-label="Menu Desktop">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-md shadow-primary/20 font-semibold"
                        : "text-on-surface-variant hover:bg-white/70 hover:text-primary font-medium"
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="material-symbols-outlined text-[20px]">
                        {item.icon}
                      </span>
                      <span className="text-[14px] truncate">{item.label}</span>
                    </span>
                    {item.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                          isActive
                            ? "bg-white/25 text-white"
                            : "bg-secondary-container/70 text-on-secondary-container"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.href === "/paket" && cartItemCount > 0 && (
                      <span
                        className={`min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          isActive
                            ? "bg-white text-primary"
                            : "bg-primary text-on-primary"
                        }`}
                      >
                        {cartItemCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Bottom Info & Logout */}
          <div className="flex flex-col gap-3 pt-4 border-t border-primary/10">
            <div className="rounded-2xl bg-primary-fixed/30 p-3 flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-primary uppercase tracking-wider">
                  Smart Greenhouse
                </p>
                <p className="text-[11px] text-on-surface-variant truncate">
                  Telemetry Supabase Realtime Aktif
                </p>
              </div>
            </div>

            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded-2xl bg-error-container/65 hover:bg-error-container text-error font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  logout
                </span>
                <span>Keluar Akun</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="w-full py-2.5 px-3 rounded-2xl bg-surface-container-high text-primary font-semibold text-[13px] flex items-center justify-center gap-2 hover:bg-secondary-container transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  login
                </span>
                <span>Masuk ke WawanFarm</span>
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE & TABLET FIXED FROSTED TOP HEADER (< 1024px) */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-50 pt-safe bg-surface/75 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,33,23,0.05)]">
        <div className="h-16 px-4 md:px-6 max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <BrandLogo size={34} />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-primary font-bold truncate">
                WawanFarm
              </span>
              <span className="text-[16px] font-semibold text-on-surface truncate leading-tight">
                {screenTitle}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/paket"
              aria-label="Keranjang & Paket"
              className="relative w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-white/60 transition-colors"
            >
              <span className="material-symbols-outlined text-[21px]">
                shopping_bag
              </span>
              {cartItemCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            <Link
              href="/profil?tab=notifikasi"
              aria-label="Notifikasi Kebun"
              className="relative w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-white/60 transition-colors"
            >
              <span className="material-symbols-outlined text-[21px]">
                notifications
              </span>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary ring-2 ring-surface" />
            </Link>

            <Link
              href={user ? "/profil" : "/login"}
              aria-label={user ? "Profil Saya" : "Masuk Akun"}
              className="p-[1.5px] rounded-full bg-gradient-to-tr from-primary to-secondary-fixed shadow-sm"
            >
              <img
                src="/images/avatar.jpg"
                alt="Akun"
                className="w-8 h-8 rounded-full object-cover block"
              />
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT SHELL (Mobile -> Tablet 2-col -> Desktop Sidebar + 3-col Grid) */}
      <div className="relative z-10 lg:pl-72 min-h-screen flex flex-col">
        {/* Desktop Top Context Strip */}
        <div className="hidden lg:flex items-center justify-between px-8 pt-6 pb-2 max-w-7xl w-full mx-auto">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-primary shadow-sm border border-white/90">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {screenTitle}
            </span>
            <span className="text-[12px] text-on-surface-variant font-medium">
              Precision Organic Hydroponic &amp; Greenhouse CRM
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/paket"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full glass-card text-[13px] font-semibold text-on-surface hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">
                shopping_bag
              </span>
              <span>Keranjang</span>
              {cartItemCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold">
                  {cartItemCount}
                </span>
              )}
            </Link>

            <Link
              href={user ? "/profil" : "/login"}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-card text-[13px] font-semibold text-on-surface hover:text-primary transition-colors"
            >
              <img
                src="/images/avatar.jpg"
                alt={displayName}
                className="w-6 h-6 rounded-full object-cover"
              />
              <span>{user ? displayName : "Masuk / Daftar"}</span>
            </Link>
          </div>
        </div>

        <main className="flex-1 w-full max-w-md md:max-w-4xl lg:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-20 lg:pt-4 pb-28 lg:pb-12">
          {children}
        </main>
      </div>

      {/* SMARTPHONE & TABLET FLOATING BOTTOM NAVIGATION BAR (< 1024px) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 pb-safe pointer-events-none">
        <div className="px-4 pb-3 flex justify-center">
          <nav
            aria-label="Navigasi Utama"
            className="pointer-events-auto w-full max-w-md h-16 px-1.5 rounded-full glass-dock flex items-center justify-between gap-0.5"
          >
            {navItems.map((item) => {
              const targetHref =
                item.href === "/profil" && !user ? "/login" : item.href;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : item.href === "/profil"
                    ? pathname.startsWith("/profil") ||
                      pathname.startsWith("/login") ||
                      pathname.startsWith("/register")
                    : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={targetHref}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex-1 flex flex-col items-center justify-center h-12 rounded-full transition-all duration-200 ${
                    isActive
                      ? "text-primary font-bold bg-primary-fixed/40 shadow-inner"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                  <span className="text-[10px] font-semibold mt-0.5 leading-none">
                    {item.href === "/profil" && !user ? "Akun" : item.shortLabel}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
