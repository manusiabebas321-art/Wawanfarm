"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { SUPER_ADMIN_EMAIL } from "@/lib/admin";
import { formatRupiah, getCropImage } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { CropIot, OrderRecord, PackageItem, UserProfile } from "@/lib/types";

type AdminTab = "orders" | "packages" | "iot";

const ORDER_STATUSES = [
  "Menunggu Pembayaran",
  "Pembayaran Terverifikasi",
  "Sedang Dipanen",
  "Dalam Pengiriman Cold-Chain",
  "Selesai",
  "Dibatalkan",
];

const CROP_STATUSES = [
  "Optimal",
  "Siap Pre-Order",
  "Siap Panen",
  "Irigasi Aktif",
  "Perlu Nutrisi",
];

export function SuperAdminConsole() {
  const { user, isSuperAdmin, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>("orders");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [crops, setCrops] = useState<CropIot[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, UserProfile>>({});
  const [fetching, setFetching] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Add / Edit Package Form State
  const [editingPkgId, setEditingPkgId] = useState<number | null>(null);
  const [pkgName, setPkgName] = useState("");
  const [pkgPeriod, setPkgPeriod] = useState("Mingguan");
  const [pkgPrice, setPkgPrice] = useState("");
  const [pkgFeatures, setPkgFeatures] = useState("");

  // Add Crop IoT Form State
  const [newCropName, setNewCropName] = useState("");
  const [newBedLocation, setNewBedLocation] = useState("");
  const [newMoisture, setNewMoisture] = useState("70");
  const [newTemp, setNewTemp] = useState("23.0");
  const [newFertilizer, setNewFertilizer] = useState("Kompos Cair Organik");
  const [newDaysLeft, setNewDaysLeft] = useState("5");
  const [newCropStatus, setNewCropStatus] = useState("Optimal");

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const loadAllAdminData = useCallback(async () => {
    if (!isSuperAdmin) return;
    setFetching(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const [ordersRes, pkgRes, cropsRes, profilesRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, user_id, package_name, total_price, order_status, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("packages").select("*").order("id", { ascending: true }),
        supabase.from("crops_iot").select("*").order("id", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, full_name, phone, address, active_package, updated_at"),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as OrderRecord[]);
      if (pkgRes.data) setPackages(pkgRes.data as PackageItem[]);
      if (cropsRes.data) setCrops(cropsRes.data as CropIot[]);
      if (profilesRes.data) {
        const map: Record<string, UserProfile> = {};
        for (const p of profilesRes.data as UserProfile[]) {
          map[p.id] = p;
        }
        setProfilesMap(map);
      }

      const firstErr =
        ordersRes.error || pkgRes.error || cropsRes.error || profilesRes.error;
      if (firstErr) {
        showFeedback(
          "error",
          `Sebagian data gagal dimuat (${firstErr.message}). Pastikan kebijakan RLS Super Admin di supabase/schema.sql sudah diterapkan.`
        );
      }
    } finally {
      setFetching(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadAllAdminData();
    }
  }, [isSuperAdmin, loadAllAdminData]);

  // Realtime sync on crops_iot & orders when Super Admin is active
  useEffect(() => {
    if (!isSuperAdmin) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crops_iot" },
        () => {
          supabase
            .from("crops_iot")
            .select("*")
            .order("id", { ascending: true })
            .then(({ data }) => {
              if (data) setCrops(data as CropIot[]);
            });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          supabase
            .from("orders")
            .select("id, user_id, package_name, total_price, order_status, created_at")
            .order("created_at", { ascending: false })
            .then(({ data }) => {
              if (data) setOrders(data as OrderRecord[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSuperAdmin]);

  const totalGmv = useMemo(
    () =>
      orders
        .filter((o) => o.order_status !== "Dibatalkan")
        .reduce((sum, o) => sum + Number(o.total_price || 0), 0),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((ord) => {
      if (statusFilter !== "all" && ord.order_status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const prof = profilesMap[ord.user_id];
      return (
        ord.package_name.toLowerCase().includes(q) ||
        String(ord.id).includes(q) ||
        (prof?.full_name ?? "").toLowerCase().includes(q) ||
        (prof?.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, profilesMap, searchQuery, statusFilter]);

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    setBusyKey(`order-${orderId}`);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("orders")
        .update({ order_status: newStatus })
        .eq("id", orderId);

      if (error) {
        showFeedback("error", `Gagal update pesanan #${orderId}: ${error.message}`);
        return;
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, order_status: newStatus } : o
        )
      );
      showFeedback(
        "success",
        `Status pesanan #${orderId} diperbarui menjadi "${newStatus}".`
      );
    } finally {
      setBusyKey(null);
    }
  };

  const resetPkgForm = () => {
    setEditingPkgId(null);
    setPkgName("");
    setPkgPeriod("Mingguan");
    setPkgPrice("");
    setPkgFeatures("");
  };

  const handleStartEditPackage = (pkg: PackageItem) => {
    setEditingPkgId(pkg.id);
    setPkgName(pkg.package_name);
    setPkgPeriod(pkg.period);
    setPkgPrice(String(pkg.price));
    setPkgFeatures(pkg.features);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(pkgPrice);
    if (!pkgName.trim() || !pkgPeriod.trim() || Number.isNaN(numericPrice)) {
      showFeedback("error", "Lengkapi nama paket, periode, dan harga valid.");
      return;
    }

    setBusyKey("pkg-save");
    try {
      const supabase = getSupabaseBrowserClient();
      if (editingPkgId !== null) {
        const { data, error } = await supabase
          .from("packages")
          .update({
            package_name: pkgName.trim(),
            period: pkgPeriod.trim(),
            price: numericPrice,
            features: pkgFeatures.trim(),
          })
          .eq("id", editingPkgId)
          .select("*")
          .single();

        if (error) {
          showFeedback("error", `Gagal mengubah paket: ${error.message}`);
          return;
        }
        setPackages((prev) =>
          prev.map((p) => (p.id === editingPkgId ? (data as PackageItem) : p))
        );
        showFeedback("success", `Paket "${pkgName.trim()}" berhasil diperbarui!`);
      } else {
        const { data, error } = await supabase
          .from("packages")
          .insert({
            package_name: pkgName.trim(),
            period: pkgPeriod.trim(),
            price: numericPrice,
            features: pkgFeatures.trim(),
          })
          .select("*")
          .single();

        if (error) {
          showFeedback("error", `Gagal menambah paket: ${error.message}`);
          return;
        }
        setPackages((prev) => [...prev, data as PackageItem]);
        showFeedback("success", `Paket baru "${pkgName.trim()}" ditambahkan!`);
      }
      resetPkgForm();
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeletePackage = async (pkg: PackageItem) => {
    setBusyKey(`pkg-del-${pkg.id}`);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("packages")
        .delete()
        .eq("id", pkg.id);
      if (error) {
        showFeedback("error", `Gagal menghapus paket: ${error.message}`);
        return;
      }
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
      if (editingPkgId === pkg.id) resetPkgForm();
      showFeedback("success", `Paket "${pkg.package_name}" telah dihapus.`);
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpdateCrop = async (
    cropId: number,
    patch: Partial<CropIot>,
    successText: string
  ) => {
    setBusyKey(`crop-${cropId}`);
    try {
      const supabase = getSupabaseBrowserClient();
      const updatePayload = {
        ...patch,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("crops_iot")
        .update(updatePayload)
        .eq("id", cropId)
        .select("*")
        .single();

      if (error) {
        showFeedback("error", `Gagal kontrol sensor IoT: ${error.message}`);
        return;
      }
      setCrops((prev) =>
        prev.map((c) => (c.id === cropId ? (data as CropIot) : c))
      );
      showFeedback("success", successText);
    } finally {
      setBusyKey(null);
    }
  };

  const handleAddCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCropName.trim() || !newBedLocation.trim()) {
      showFeedback("error", "Nama komoditas dan lokasi bedeng wajib diisi.");
      return;
    }
    setBusyKey("crop-add");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("crops_iot")
        .insert({
          crop_name: newCropName.trim(),
          bed_location: newBedLocation.trim(),
          soil_moisture: Number(newMoisture) || 70,
          temperature: Number(newTemp) || 23,
          organic_fertilizer: newFertilizer.trim() || "Kompos Cair Organik",
          last_fertilized: "Baru saja",
          harvest_days_left: Number(newDaysLeft) || 5,
          status: newCropStatus,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        showFeedback("error", `Gagal menambah sensor IoT: ${error.message}`);
        return;
      }
      setCrops((prev) => [...prev, data as CropIot]);
      setNewCropName("");
      setNewBedLocation("");
      showFeedback("success", `Komoditas IoT "${data.crop_name}" ditambahkan!`);
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center text-on-surface-variant">
        Memeriksa otorisasi Super Admin...
      </div>
    );
  }

  // Strict Access Gate: Sembunyikan seluruh panel admin jika bukan email Super Admin
  if (!user || !isSuperAdmin) {
    return (
      <div className="max-w-lg mx-auto glass-card-elevated rounded-3xl p-7 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-error-container/70 flex items-center justify-center text-error">
          <span className="material-symbols-outlined text-[32px]">lock</span>
        </div>
        <h1 className="text-[22px] font-bold text-on-surface">
          Akses Khusus Super Admin
        </h1>
        <p className="text-[14px] text-on-surface-variant leading-relaxed">
          Panel kontrol operasional ini disembunyikan untuk akun pengguna biasa
          dan hanya dapat dibuka oleh akun Super Admin WawanFarm yang
          terautentikasi.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link
            href="/"
            className="h-11 px-5 rounded-full bg-surface-container-high text-primary text-[13px] font-semibold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            <span>Kembali ke Beranda</span>
          </Link>
          {!user && (
            <Link
              href="/login"
              className="h-11 px-5 rounded-full bg-primary text-on-primary text-[13px] font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">
                login
              </span>
              <span>Masuk Akun</span>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Super Admin Root Identity Pill & KPIs (Stitch 06_super_admin) */}
      <section className="glass-card-elevated rounded-3xl p-5 md:p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-12 -top-12 w-44 h-44 bg-primary/10 rounded-full blur-2xl" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-lg shadow-primary/25 text-on-primary">
                <span className="material-symbols-outlined text-[28px]">
                  shield_person
                </span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-secondary rounded-full ring-2 ring-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[20px] md:text-[22px] font-bold text-on-surface">
                  Super Admin Root Console
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">
                  #SA-01
                </span>
              </div>
              <p className="text-[13px] text-on-surface-variant">
                Terautentikasi sebagai{" "}
                <strong className="text-primary">{SUPER_ADMIN_EMAIL}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAllAdminData}
            disabled={fetching}
            className="h-10 px-4 rounded-full bg-surface-container-high text-primary text-[13px] font-semibold flex items-center gap-1.5 hover:bg-secondary-container transition-colors cursor-pointer w-fit"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                fetching ? "animate-spin" : ""
              }`}
            >
              refresh
            </span>
            <span>Sinkronkan Data</span>
          </button>
        </div>

        {/* 3 KPI Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
          <div className="bg-surface-container-low/75 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-on-surface-variant block">
                Total Pesanan
              </span>
              <span className="text-[24px] font-bold text-on-surface tabular-nums">
                {orders.length}
              </span>
              <span className="text-[11px] text-primary font-semibold block">
                GMV: {formatRupiah(totalGmv)}
              </span>
            </div>
            <span className="material-symbols-outlined text-[28px] text-primary">
              receipt_long
            </span>
          </div>

          <div className="bg-surface-container-low/75 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-on-surface-variant block">
                Katalog Paket Aktif
              </span>
              <span className="text-[24px] font-bold text-on-surface tabular-nums">
                {packages.length}
              </span>
              <span className="text-[11px] text-on-surface-variant block">
                Tabel packages Supabase
              </span>
            </div>
            <span className="material-symbols-outlined text-[28px] text-primary">
              inventory_2
            </span>
          </div>

          <div className="bg-surface-container-low/75 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-on-surface-variant block">
                Sensor IoT Online
              </span>
              <span className="text-[24px] font-bold text-on-surface tabular-nums">
                {crops.length}/{crops.length}
              </span>
              <span className="text-[11px] text-primary font-semibold block">
                Realtime 100% Terhubung
              </span>
            </div>
            <span className="material-symbols-outlined text-[28px] text-primary">
              sensors
            </span>
          </div>
        </div>
      </section>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-[13px] font-semibold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-primary-fixed/65 text-on-primary-fixed"
              : "bg-error-container text-on-error-container"
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">
            {feedback.type === "success" ? "check_circle" : "error"}
          </span>
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Segmented Control Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          {
            id: "orders" as const,
            label: `Kelola Pesanan (${orders.length})`,
            icon: "shopping_bag",
          },
          {
            id: "packages" as const,
            label: `Kelola Paket (${packages.length})`,
            icon: "storefront",
          },
          {
            id: "iot" as const,
            label: `Kontrol Sensor IoT (${crops.length})`,
            icon: "sensors",
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-full text-[13px] font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-primary text-on-primary shadow-md shadow-primary/20"
                : "glass-card text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: KELOLA PESANAN */}
      {activeTab === "orders" && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3.5 top-3 text-on-surface-variant text-[19px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ID pesanan, paket, atau nama pelanggan..."
                className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white/90 text-[13px] text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {["all", ...ORDER_STATUSES].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    statusFilter === st
                      ? "bg-primary text-on-primary"
                      : "bg-white/80 text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {st === "all" ? "Semua Status" : st}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="glass-card rounded-3xl p-6 text-center text-on-surface-variant text-[13px]">
              Tidak ada pesanan yang cocok dengan filter saat ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((ord) => {
                const prof = profilesMap[ord.user_id];
                const isBusy = busyKey === `order-${ord.id}`;
                return (
                  <article
                    key={ord.id}
                    className="glass-card-elevated rounded-3xl p-5 flex flex-col justify-between gap-3.5"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-primary">
                          Order #{ord.id}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed/60 text-on-primary-fixed text-[10px] font-bold">
                          {ord.order_status}
                        </span>
                      </div>

                      <h3 className="text-[15px] font-bold text-on-surface leading-snug">
                        {ord.package_name}
                      </h3>

                      <div className="rounded-2xl bg-surface-container-low/70 p-3 text-[12px] space-y-1">
                        <p className="font-semibold text-on-surface">
                          {prof?.full_name || "Pelanggan WawanFarm"}
                        </p>
                        {prof?.phone && (
                          <p className="text-on-surface-variant">{prof.phone}</p>
                        )}
                        {prof?.address && (
                          <p className="text-on-surface-variant line-clamp-2">
                            {prof.address}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[12px] text-on-surface-variant">
                          Total
                        </span>
                        <span className="text-[18px] font-bold text-primary tabular-nums">
                          {formatRupiah(ord.total_price)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 pt-2 border-t border-primary/10">
                      <label className="text-[10px] font-bold uppercase text-on-surface-variant">
                        Ubah Status Pesanan
                      </label>
                      <select
                        disabled={isBusy}
                        value={ord.order_status}
                        onChange={(e) =>
                          handleUpdateOrderStatus(ord.id, e.target.value)
                        }
                        className="h-10 px-3 rounded-xl bg-white text-[13px] font-semibold text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: TAMBAH / EDIT PAKET */}
      {activeTab === "packages" && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Add/Edit Package Form */}
          <div className="lg:col-span-4 glass-card-elevated rounded-3xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-on-surface">
                {editingPkgId !== null
                  ? `Edit Paket #${editingPkgId}`
                  : "Tambah Paket Baru"}
              </h2>
              {editingPkgId !== null && (
                <button
                  type="button"
                  onClick={resetPkgForm}
                  className="text-[12px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSavePackage} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase text-on-surface-variant">
                  Nama Paket
                </label>
                <input
                  type="text"
                  required
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                  placeholder="Contoh: Paket Organik Premium"
                  className="h-11 px-3.5 rounded-xl bg-white text-[13px] text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase text-on-surface-variant">
                    Periode
                  </label>
                  <input
                    type="text"
                    required
                    value={pkgPeriod}
                    onChange={(e) => setPkgPeriod(e.target.value)}
                    placeholder="Mingguan / Bulanan"
                    className="h-11 px-3 rounded-xl bg-white text-[13px] text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase text-on-surface-variant">
                    Harga (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={pkgPrice}
                    onChange={(e) => setPkgPrice(e.target.value)}
                    placeholder="125000"
                    className="h-11 px-3 rounded-xl bg-white text-[13px] text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase text-on-surface-variant">
                  Fitur Paket (pisahkan dengan +)
                </label>
                <textarea
                  rows={3}
                  required
                  value={pkgFeatures}
                  onChange={(e) => setPkgFeatures(e.target.value)}
                  placeholder="5 jenis sayur organik + bebas ongkir + pantau IoT"
                  className="p-3 rounded-xl bg-white text-[13px] text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={busyKey === "pkg-save"}
                className="w-full h-11 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary text-[14px] font-bold shadow-md cursor-pointer disabled:opacity-60"
              >
                {busyKey === "pkg-save"
                  ? "Menyimpan..."
                  : editingPkgId !== null
                    ? "Simpan Perubahan Paket"
                    : "Tambah Paket ke Supabase"}
              </button>
            </form>
          </div>

          {/* Package List Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map((pkg) => (
              <article
                key={pkg.id}
                className="glass-card rounded-3xl p-5 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed/55 text-on-primary-fixed text-[10px] font-bold uppercase">
                      {pkg.period}
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      ID #{pkg.id}
                    </span>
                  </div>
                  <h3 className="text-[17px] font-bold text-on-surface mt-2">
                    {pkg.package_name}
                  </h3>
                  <p className="text-[22px] font-bold text-primary mt-1 tabular-nums">
                    {formatRupiah(pkg.price)}
                  </p>
                  <p className="text-[13px] text-on-surface-variant mt-2">
                    {pkg.features}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleStartEditPackage(pkg)}
                    className="h-10 rounded-full bg-surface-container-high text-primary text-[12px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      edit
                    </span>
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === `pkg-del-${pkg.id}`}
                    onClick={() => handleDeletePackage(pkg)}
                    className="h-10 rounded-full bg-error-container/75 text-error text-[12px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      delete
                    </span>
                    <span>Hapus</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: KONTROL SENSOR IOT */}
      {activeTab === "iot" && (
        <section className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {crops.map((crop) => {
              const isBusy = busyKey === `crop-${crop.id}`;
              return (
                <article
                  key={crop.id}
                  className="glass-card-elevated rounded-3xl p-5 flex flex-col gap-4"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={getCropImage(crop.crop_name)}
                      alt={crop.crop_name}
                      className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase text-primary">
                        {crop.bed_location} • ID #{crop.id}
                      </span>
                      <h3 className="text-[16px] font-bold text-on-surface truncate">
                        {crop.crop_name}
                      </h3>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold">
                        {crop.status}
                      </span>
                    </div>
                  </div>

                  {/* Soil Moisture Controls */}
                  <div className="rounded-2xl bg-surface-container-low/75 p-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-on-surface-variant block">
                        Kelembapan Tanah
                      </span>
                      <span className="text-[20px] font-bold text-primary tabular-nums">
                        {crop.soil_moisture}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleUpdateCrop(
                            crop.id,
                            {
                              soil_moisture: Math.max(
                                20,
                                Number(crop.soil_moisture) - 5
                              ),
                            },
                            `Kelembapan ${crop.crop_name} diturunkan 5%.`
                          )
                        }
                        className="w-8 h-8 rounded-lg bg-white text-primary font-bold shadow-xs cursor-pointer"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleUpdateCrop(
                            crop.id,
                            {
                              soil_moisture: Math.min(
                                100,
                                Number(crop.soil_moisture) + 5
                              ),
                            },
                            `Irigasi ${crop.crop_name} +5% kelembapan.`
                          )
                        }
                        className="w-8 h-8 rounded-lg bg-primary text-on-primary font-bold shadow-xs cursor-pointer"
                      >
                        +5
                      </button>
                    </div>
                  </div>

                  {/* Temperature & Harvest Days Controls */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl bg-white/85 p-3 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase text-on-surface-variant">
                        Suhu (°C)
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-[16px] font-bold text-on-surface tabular-nums">
                          {crop.temperature}°
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleUpdateCrop(
                                crop.id,
                                {
                                  temperature: Number(
                                    (Number(crop.temperature) - 0.5).toFixed(1)
                                  ),
                                },
                                `Cooling mist ${crop.crop_name} (-0.5°C).`
                              )
                            }
                            className="w-6 h-6 rounded bg-surface-container-high text-primary font-bold text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleUpdateCrop(
                                crop.id,
                                {
                                  temperature: Number(
                                    (Number(crop.temperature) + 0.5).toFixed(1)
                                  ),
                                },
                                `Suhu ${crop.crop_name} (+0.5°C).`
                              )
                            }
                            className="w-6 h-6 rounded bg-primary text-on-primary font-bold text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/85 p-3 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase text-on-surface-variant">
                        Hitung Panen
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-[16px] font-bold text-on-surface tabular-nums">
                          {crop.harvest_days_left} hr
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleUpdateCrop(
                                crop.id,
                                {
                                  harvest_days_left: Math.max(
                                    0,
                                    Number(crop.harvest_days_left) - 1
                                  ),
                                },
                                `Estimasi panen ${crop.crop_name} diperbarui.`
                              )
                            }
                            className="w-6 h-6 rounded bg-surface-container-high text-primary font-bold text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleUpdateCrop(
                                crop.id,
                                {
                                  harvest_days_left:
                                    Number(crop.harvest_days_left) + 1,
                                },
                                `Estimasi panen ${crop.crop_name} diperbarui.`
                              )
                            }
                            className="w-6 h-6 rounded bg-primary text-on-primary font-bold text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status & Fertilizer Actions */}
                  <div className="flex flex-col gap-2">
                    <select
                      disabled={isBusy}
                      value={crop.status}
                      onChange={(e) =>
                        handleUpdateCrop(
                          crop.id,
                          { status: e.target.value },
                          `Status ${crop.crop_name} diubah ke "${e.target.value}".`
                        )
                      }
                      className="h-10 px-3 rounded-xl bg-white text-[13px] font-semibold text-on-surface shadow-xs focus:outline-none cursor-pointer"
                    >
                      {CROP_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        handleUpdateCrop(
                          crop.id,
                          { last_fertilized: "Baru saja" },
                          `Pemupukan ${crop.organic_fertilizer} dicatat untuk ${crop.crop_name}!`
                        )
                      }
                      className="h-10 rounded-full bg-surface-container-high text-primary text-[12px] font-bold hover:bg-secondary-container transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        compost
                      </span>
                      <span>Catat Pupuk ({crop.last_fertilized})</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Tambah Komoditas / Bedeng IoT Baru */}
          <div className="glass-card-elevated rounded-3xl p-5 md:p-6">
            <h2 className="text-[18px] font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">
                add_box
              </span>
              Tambah Node Sensor &amp; Komoditas IoT Baru
            </h2>

            <form
              onSubmit={handleAddCrop}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
            >
              <input
                type="text"
                required
                value={newCropName}
                onChange={(e) => setNewCropName(e.target.value)}
                placeholder="Nama Komoditas (cth: Kale Nero)"
                className="h-11 px-3.5 rounded-xl bg-white text-[13px] shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="text"
                required
                value={newBedLocation}
                onChange={(e) => setNewBedLocation(e.target.value)}
                placeholder="Lokasi (cth: Bedeng B4)"
                className="h-11 px-3.5 rounded-xl bg-white text-[13px] shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="text"
                value={newFertilizer}
                onChange={(e) => setNewFertilizer(e.target.value)}
                placeholder="Pupuk Organik"
                className="h-11 px-3.5 rounded-xl bg-white text-[13px] shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={newMoisture}
                  onChange={(e) => setNewMoisture(e.target.value)}
                  placeholder="%"
                  title="Kelembapan %"
                  className="h-11 px-2.5 rounded-xl bg-white text-[13px] shadow-xs focus:outline-none"
                />
                <input
                  type="number"
                  step="0.1"
                  value={newTemp}
                  onChange={(e) => setNewTemp(e.target.value)}
                  placeholder="°C"
                  title="Suhu °C"
                  className="h-11 px-2.5 rounded-xl bg-white text-[13px] shadow-xs focus:outline-none"
                />
                <input
                  type="number"
                  value={newDaysLeft}
                  onChange={(e) => setNewDaysLeft(e.target.value)}
                  placeholder="Hari"
                  title="Hitung Mundur Panen (Hari)"
                  className="h-11 px-2.5 rounded-xl bg-white text-[13px] shadow-xs focus:outline-none"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3 pt-1">
                <select
                  value={newCropStatus}
                  onChange={(e) => setNewCropStatus(e.target.value)}
                  className="h-11 px-3.5 rounded-xl bg-white text-[13px] font-semibold shadow-xs focus:outline-none"
                >
                  {CROP_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      Status: {st}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={busyKey === "crop-add"}
                  className="h-11 px-6 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary text-[14px] font-bold shadow-md cursor-pointer disabled:opacity-60"
                >
                  {busyKey === "crop-add"
                    ? "Menambahkan..."
                    : "+ Tambah Komoditas IoT"}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
