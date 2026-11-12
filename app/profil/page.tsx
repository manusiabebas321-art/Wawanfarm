"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { formatRupiah } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { OrderRecord } from "@/lib/types";

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab =
    searchParams.get("tab") === "notifikasi" ? "notifikasi" : "profil";

  const { user, profile, isSuperAdmin, loading, refreshProfile, signOut } =
    useAuth();

  const [activeTab, setActiveTab] = useState<"profil" | "notifikasi">(
    initialTab
  );
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [notifFilter, setNotifFilter] = useState<
    "all" | "iot" | "order" | "account"
  >("all");
  const [waNotif, setWaNotif] = useState(true);
  const [iotAlarm, setIotAlarm] = useState(true);

  useEffect(() => {
    if (searchParams.get("tab") === "notifikasi") {
      setActiveTab("notifikasi");
    }
  }, [searchParams]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("orders")
      .select("id, user_id, package_name, total_price, order_status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setOrders(data as OrderRecord[]);
      });
  }, [user?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMessage(null);
    setSaveMessage(null);
    setSaving(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          active_package: profile?.active_package ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (error) {
        setErrorMessage(
          error.message || "Gagal menyimpan profil ke Supabase."
        );
        return;
      }

      await refreshProfile();
      setSaveMessage("Biodata & alamat pengiriman berhasil diperbarui!");
      setTimeout(() => setSaveMessage(null), 3500);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal terhubung ke Supabase."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center text-on-surface-variant">
        Memuat profil akun WawanFarm...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto glass-card-elevated rounded-3xl p-7 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[32px]">
            shield_person
          </span>
        </div>
        <h1 className="text-[22px] font-bold text-on-surface">
          Masuk untuk Mengelola Profil
        </h1>
        <p className="text-[14px] text-on-surface-variant">
          Halaman pengaturan profil terhubung langsung dengan Supabase Auth &amp;
          tabel <code>profiles</code> untuk menyimpan nama, nomor HP, alamat
          pengiriman, dan melihat paket aktif Anda.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <Link
            href="/login"
            className="h-11 px-6 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary text-[14px] font-semibold flex items-center gap-2 shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">
              login
            </span>
            <span>Masuk Akun</span>
          </Link>
          <Link
            href="/register"
            className="h-11 px-6 rounded-full bg-white text-primary text-[14px] font-semibold flex items-center gap-2 border border-primary/15"
          >
            <span>Daftar Baru</span>
          </Link>
        </div>
      </div>
    );
  }

  const displayName =
    fullName || profile?.full_name || user.email?.split("@")[0] || "Pelanggan";

  const alerts = [
    {
      id: 1,
      category: "iot" as const,
      title: "Sinkronisasi Sensor Bedeng A1 & B2",
      desc: "Kelembapan tanah & suhu greenhouse berada pada rentang optimal 65–78%.",
      time: "Hari ini",
      badge: "IoT Live",
      icon: "sensors",
    },
    {
      id: 2,
      category: "order" as const,
      title: "Jadwal Petik Fajar 05:30 WIB",
      desc: "Komoditas siap panen diprioritaskan ke armada cold-chain suhu 3.8°C.",
      time: "05:30 WIB",
      badge: "Panen Segar",
      icon: "local_shipping",
    },
    {
      id: 3,
      category: "account" as const,
      title: "Status Keanggotaan Terverifikasi",
      desc: `Akun ${user.email} aktif dan tersinkron dengan tabel profiles Supabase.`,
      time: "Aktif",
      badge: "Akun",
      icon: "verified_user",
    },
  ];

  const filteredAlerts =
    notifFilter === "all"
      ? alerts
      : alerts.filter((a) => a.category === notifFilter);

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Sub-Tabs Switcher (Profil & Biodata vs Notifikasi Kebun) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="p-1 rounded-full bg-surface-container-high/65 backdrop-blur-xl inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("profil")}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "profil"
                ? "bg-white text-primary shadow-sm"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              manage_accounts
            </span>
            <span>Pengaturan Profil</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notifikasi")}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "notifikasi"
                ? "bg-white text-primary shadow-sm"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              notifications_active
            </span>
            <span>Notifikasi Kebun</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="h-10 px-4 rounded-full bg-error-container/75 hover:bg-error-container text-error text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span>Logout</span>
        </button>
      </div>

      {/* Panel Akses Khusus Super Admin (Disembunyikan untuk pengguna biasa) */}
      {isSuperAdmin && (
        <section className="rounded-3xl bg-gradient-to-r from-inverse-surface via-primary to-primary-container text-on-primary p-5 md:p-6 shadow-xl relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 bg-secondary-fixed/25 rounded-full blur-2xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[26px] text-secondary-fixed">
                  shield_person
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold uppercase tracking-wider">
                    Super Admin Root #SA-01
                  </span>
                  <span className="text-[11px] text-primary-fixed font-semibold">
                    Akses Penuh Aktif
                  </span>
                </div>
                <h2 className="text-[18px] md:text-[20px] font-bold mt-1">
                  Panel Kontrol Operasional WawanFarm
                </h2>
                <p className="text-[13px] text-primary-fixed/90 mt-0.5">
                  Kelola seluruh pesanan masuk, tambah/edit katalog paket, dan
                  kendalikan telemetri sensor IoT greenhouse secara langsung.
                </p>
              </div>
            </div>

            <Link
              href="/admin"
              className="h-11 px-5 rounded-full bg-white text-primary font-bold text-[13px] shadow-md hover:bg-surface-bright transition-colors inline-flex items-center justify-center gap-2 flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">
                admin_panel_settings
              </span>
              <span>Buka Panel Super Admin</span>
            </Link>
          </div>
        </section>
      )}

      {activeTab === "profil" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          {/* Column 1: Avatar + Active Package + Membership Card (Stitch 04 & 07) */}
          <section className="glass-card-elevated rounded-3xl p-6 flex flex-col items-center text-center gap-4 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-secondary-container/30 rounded-full blur-2xl pointer-events-none" />

            <div className="relative">
              <div className="w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-primary via-secondary-container to-primary-fixed shadow-lg">
                <img
                  src="/images/avatar.jpg"
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-primary ring-2 ring-white" />
            </div>

            <div>
              <div className="flex items-center justify-center gap-1.5">
                <h1 className="text-[20px] font-bold text-on-surface">
                  {displayName}
                </h1>
                <span
                  className="material-symbols-outlined text-[18px] text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
              </div>
              <p className="text-[13px] text-on-surface-variant mt-0.5">
                {user.email}
              </p>
            </div>

            {/* Paket Aktif Card */}
            <div className="w-full rounded-2xl bg-gradient-to-br from-primary-fixed/50 to-surface-container-low p-4 text-left border border-white">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Paket Aktif Anda
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white text-primary text-[10px] font-bold">
                  {profile?.active_package ? "Aktif" : "Belum Berlangganan"}
                </span>
              </div>
              <p className="text-[16px] font-bold text-on-surface">
                {profile?.active_package || "Belum ada paket aktif"}
              </p>
              <Link
                href="/paket"
                className="inline-flex items-center gap-1 text-[12px] font-bold text-primary mt-2 hover:underline"
              >
                <span>
                  {profile?.active_package
                    ? "Kelola atau Upgrade Paket"
                    : "Pilih Paket Panen"}
                </span>
                <span className="material-symbols-outlined text-[15px]">
                  arrow_forward
                </span>
              </Link>
            </div>

            <div className="w-full grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-surface-container-low/70 p-3 text-center">
                <span className="text-[10px] font-bold uppercase text-on-surface-variant block">
                  Total Pesanan
                </span>
                <span className="text-[18px] font-bold text-on-surface tabular-nums">
                  {orders.length}
                </span>
              </div>
              <div className="rounded-2xl bg-surface-container-low/70 p-3 text-center">
                <span className="text-[10px] font-bold uppercase text-on-surface-variant block">
                  Sertifikasi
                </span>
                <span className="text-[13px] font-bold text-primary mt-0.5 block">
                  SNI Organik
                </span>
              </div>
            </div>
          </section>

          {/* Column 2: Edit Biodata & Alamat Form (Supabase `profiles`) */}
          <section className="glass-card-elevated rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">
                person_pin
              </span>
              <div>
                <h2 className="text-[18px] font-bold text-on-surface">
                  Biodata &amp; Pengiriman
                </h2>
                <p className="text-[12px] text-on-surface-variant">
                  Tersimpan ke tabel <code>profiles</code> di Supabase
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-error-container/80 text-on-error-container text-[13px] font-medium">
                  {errorMessage}
                </div>
              )}

              {saveMessage && (
                <div className="p-3 rounded-2xl bg-primary-fixed/60 text-on-primary-fixed text-[13px] font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    check_circle
                  </span>
                  <span>{saveMessage}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="profileName"
                  className="text-[11px] uppercase font-bold tracking-wider text-on-surface-variant"
                >
                  Nama Lengkap
                </label>
                <input
                  id="profileName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  className="h-11 px-3.5 rounded-xl bg-white/90 text-[14px] text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="profilePhone"
                  className="text-[11px] uppercase font-bold tracking-wider text-on-surface-variant"
                >
                  Nomor HP / WhatsApp
                </label>
                <input
                  id="profilePhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081299814421"
                  className="h-11 px-3.5 rounded-xl bg-white/90 text-[14px] text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="profileAddress"
                  className="text-[11px] uppercase font-bold tracking-wider text-on-surface-variant"
                >
                  Alamat Pengiriman Utama
                </label>
                <textarea
                  id="profileAddress"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Contoh No. 44, Kecamatan, Kota, Kode Pos"
                  className="p-3.5 rounded-xl bg-white/90 text-[14px] text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase font-bold tracking-wider text-on-surface-variant">
                  Email Terdaftar
                </span>
                <input
                  type="email"
                  readOnly
                  value={user.email ?? ""}
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low/70 text-[13px] text-on-surface-variant focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-12 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary text-[14px] font-bold shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {saving ? "progress_activity" : "save"}
                </span>
                <span>
                  {saving ? "Menyimpan..." : "Simpan Perubahan Profil"}
                </span>
              </button>
            </form>
          </section>

          {/* Column 3: Recent Orders & Account Safety (md:col-span-2 lg:col-span-1) */}
          <section className="glass-card rounded-3xl p-6 flex flex-col gap-4 md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  receipt_long
                </span>
                <h2 className="text-[18px] font-bold text-on-surface">
                  Pesanan Terbaru
                </h2>
              </div>
              <Link
                href="/paket#tracking"
                className="text-[12px] font-bold text-primary hover:underline"
              >
                Semua
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="rounded-2xl bg-surface-container-low/70 p-4 text-[13px] text-on-surface-variant">
                Belum ada pesanan yang dibuat. Pilih paket panen organik untuk
                memulai pengiriman cold-chain pertama Anda.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="rounded-2xl bg-white/85 p-3.5 shadow-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-on-surface truncate">
                        {ord.package_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-primary-fixed/50 text-on-primary-fixed text-[10px] font-bold flex-shrink-0">
                        {ord.order_status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-bold text-primary tabular-nums">
                        {formatRupiah(ord.total_price)}
                      </span>
                      <span className="text-on-surface-variant">
                        {new Date(ord.created_at).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl bg-surface-container-low/70 p-4 flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-on-surface">
                  Sertifikat Organik SNI 6729:2016
                </span>
                <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold">
                  0% Residu
                </span>
              </div>
              <p className="text-[12px] text-on-surface-variant">
                Reg No: 042/LSO-003-IDN • Panen diawasi sensor IoT WawanFarm.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full h-11 rounded-2xl bg-error-container/65 hover:bg-error-container text-error font-bold text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer mt-1"
            >
              <span className="material-symbols-outlined text-[19px]">
                logout
              </span>
              <span>Keluar dari Akun {displayName}</span>
            </button>
          </section>
        </div>
      ) : (
        /* Notifications & Alerts View (Stitch 10_notifications) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "Semua" },
                { id: "iot", label: "Kebun & IoT" },
                { id: "order", label: "Pesanan & Panen" },
                { id: "account", label: "Akun" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setNotifFilter(
                      tab.id as "all" | "iot" | "order" | "account"
                    )
                  }
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                    notifFilter === tab.id
                      ? "bg-primary text-on-primary shadow-sm"
                      : "bg-white/80 text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
              {filteredAlerts.map((item) => (
                <div
                  key={item.id}
                  className="glass-card rounded-2xl p-4 flex items-start gap-3.5"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      {item.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {item.badge}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        {item.time}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-bold text-on-surface">
                      {item.title}
                    </h3>
                    <p className="text-[13px] text-on-surface-variant mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card-elevated rounded-3xl p-5 flex flex-col gap-3">
            <h3 className="text-[16px] font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                tune
              </span>
              Preferensi Peringatan
            </h3>
            <label className="flex items-center justify-between p-3 rounded-2xl bg-white/85 cursor-pointer">
              <div>
                <p className="text-[13px] font-semibold text-on-surface">
                  Notifikasi WhatsApp
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  Update pengiriman &amp; panen
                </p>
              </div>
              <input
                type="checkbox"
                checked={waNotif}
                onChange={(e) => setWaNotif(e.target.checked)}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-2xl bg-white/85 cursor-pointer">
              <div>
                <p className="text-[13px] font-semibold text-on-surface">
                  Alarm Push Sensor IoT
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  Peringatan kelembapan &amp; suhu
                </p>
              </div>
              <input
                type="checkbox"
                checked={iotAlarm}
                onChange={(e) => setIotAlarm(e.target.checked)}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilPage() {
  return (
    <Suspense
      fallback={
        <div className="glass-card rounded-3xl p-8 text-center text-on-surface-variant">
          Memuat halaman profil...
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
