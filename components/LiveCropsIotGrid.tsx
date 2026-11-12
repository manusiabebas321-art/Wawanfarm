"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  PRODUCE_ADDONS,
  formatCountdownFromDays,
  formatRupiah,
  getCropImage,
} from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { CropIot } from "@/lib/types";

interface LiveCropsIotGridProps {
  initialCrops: CropIot[];
}

export function LiveCropsIotGrid({ initialCrops }: LiveCropsIotGridProps) {
  const { updateAddonQty, cartItemCount } = useAuth();
  const [crops, setCrops] = useState<CropIot[]>(initialCrops);
  const [realtimeStatus, setRealtimeStatus] = useState<
    "connecting" | "connected" | "fallback"
  >("connecting");
  const [lastSyncText, setLastSyncText] = useState("Sinkronisasi aktif");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [deviceCode, setDeviceCode] = useState("");
  const [pairingSuccess, setPairingSuccess] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  // Live 1-second harvest countdown clock
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Supabase Realtime subscription on `crops_iot`
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel("crops-iot-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crops_iot",
        },
        (payload) => {
          setLastSyncText(
            `Update realtime ${new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}`
          );

          if (payload.eventType === "INSERT") {
            const inserted = payload.new as CropIot;
            setCrops((prev) => {
              if (prev.some((c) => c.id === inserted.id)) return prev;
              return [...prev, inserted].sort((a, b) => a.id - b.id);
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as CropIot;
            setCrops((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            );
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: number };
            if (oldRow?.id !== undefined) {
              setCrops((prev) => prev.filter((c) => c.id !== oldRow.id));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("fallback");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefreshNow = async () => {
    setRefreshing(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("crops_iot")
        .select("*")
        .order("id", { ascending: true });
      if (!error && data) {
        setCrops(data as CropIot[]);
        setLastSyncText(
          `Disegarkan ${new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}`
        );
        showToast("Data sensor IoT berhasil disegarkan!");
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualPair = () => {
    if (!deviceCode.trim()) return;
    setPairingSuccess(
      `Perangkat ${deviceCode.trim()} terhubung ke jaringan mesh Greenhouse WawanFarm.`
    );
  };

  const avgMoisture =
    crops.length > 0
      ? Math.round(
          crops.reduce((sum, c) => sum + Number(c.soil_moisture || 0), 0) /
            crops.length
        )
      : 72;

  const avgTemp =
    crops.length > 0
      ? (
          crops.reduce((sum, c) => sum + Number(c.temperature || 0), 0) /
          crops.length
        ).toFixed(1)
      : "22.8";

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-inverse-surface/95 text-inverse-on-surface shadow-xl text-[13px] font-semibold flex items-center gap-2 backdrop-blur-md">
          <span className="material-symbols-outlined text-[18px] text-primary-fixed">
            check_circle
          </span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Greenhouse Status Banner + Live Cam Preview (Mobile 1-col, Tablet/Desktop 2-col) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Status Bar & Lokasi Kebun Aktif */}
        <section className="rounded-3xl p-5 glass-card-elevated flex flex-col justify-between gap-4 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-secondary-container/50 flex items-center justify-center flex-shrink-0 text-primary">
                <span className="material-symbols-outlined text-[24px]">
                  energy_savings_leaf
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                    {realtimeStatus === "connected"
                      ? "Supabase Realtime Aktif"
                      : realtimeStatus === "connecting"
                        ? "Menghubungkan Realtime..."
                        : "Mode Sinkronisasi Langsung"}
                  </span>
                </div>
                <h1 className="text-[20px] font-bold text-on-surface truncate mt-0.5">
                  Greenhouse #04 &amp; Bedeng Organik
                </h1>
                <span className="text-[12px] text-on-surface-variant flex items-center gap-1 truncate">
                  <span className="material-symbols-outlined text-[14px]">
                    location_on
                  </span>
                  Lembang Organic Valley • {crops.length} Zona Terpantau
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl bg-surface-container-low/75 p-3">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant block">
                Rata Kelembapan
              </span>
              <span className="text-[22px] font-bold text-primary tabular-nums">
                {avgMoisture}%
              </span>
            </div>
            <div className="rounded-2xl bg-surface-container-low/75 p-3">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant block">
                Rata Suhu
              </span>
              <span className="text-[22px] font-bold text-on-surface tabular-nums">
                {avgTemp}°C
              </span>
            </div>
            <div className="rounded-2xl bg-surface-container-low/75 p-3">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant block">
                Irigasi Auto
              </span>
              <span className="text-[15px] font-bold text-primary mt-1 block">
                Optimal
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-on-surface-variant font-medium">
              {lastSyncText}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowScannerModal(true)}
                className="h-9 px-3.5 rounded-full bg-surface-container-high text-primary text-[12px] font-semibold flex items-center gap-1.5 hover:bg-secondary-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  qr_code_scanner
                </span>
                <span>Pair Node IoT</span>
              </button>
              <button
                type="button"
                onClick={handleRefreshNow}
                disabled={refreshing}
                className="h-9 px-3.5 rounded-full bg-primary text-on-primary text-[12px] font-semibold flex items-center gap-1.5 hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-60"
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    refreshing ? "animate-spin" : ""
                  }`}
                >
                  autorenew
                </span>
                <span>Segarkan</span>
              </button>
            </div>
          </div>
        </section>

        {/* Live Snapshot Preview Kebun Pelanggan */}
        <section className="relative rounded-3xl overflow-hidden shadow-md min-h-[220px]">
          <img
            src="/images/live-cam.jpg"
            alt="Pantauan Tanaman Real-Time Greenhouse WawanFarm"
            className="w-full h-full object-cover absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface/85 via-on-surface/25 to-transparent" />

          <div className="relative z-10 h-full p-5 flex flex-col justify-between min-h-[220px]">
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-full bg-on-surface/70 backdrop-blur-md flex items-center gap-1.5 text-white">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[10px] tracking-wider uppercase font-bold">
                  Live Cam 04
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-white/85 backdrop-blur-md text-on-surface">
                <span className="text-[10px] font-semibold">
                  Kamera Spektral HD
                </span>
              </div>
            </div>

            <div className="flex items-end justify-between gap-2">
              <div className="text-white">
                <span className="text-[11px] text-secondary-fixed block font-semibold">
                  Monitoring 24/7 Bebas Pestisida
                </span>
                <p className="text-[17px] font-bold">
                  Pantauan Komoditas Organik
                </p>
              </div>
              <Link
                href="/ai-chat"
                className="h-9 px-3.5 rounded-full bg-white/90 backdrop-blur-md text-primary text-[12px] font-bold flex items-center gap-1 shadow-sm hover:bg-white transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  smart_toy
                </span>
                <span>Tanya AI</span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* LIVE SENSOR CARDS FROM `crops_iot` (1-col Mobile, 2-col Tablet, 3-col Desktop) */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">
              sensors
            </span>
            <div>
              <h2 className="text-[18px] font-bold text-on-surface">
                Kartu Komoditas &amp; Sensor IoT Realtime
              </h2>
              <p className="text-[12px] text-on-surface-variant">
                Kelembapan tanah, suhu, nutrisi pupuk organik, dan hitung mundur
                panen dari tabel <code>crops_iot</code>
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed/50 text-on-primary-fixed text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            {crops.length} Komoditas Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {crops.map((crop) => {
            const countdown = formatCountdownFromDays(
              crop.harvest_days_left,
              nowMs
            );
            const moisture = Math.min(
              100,
              Math.max(0, Number(crop.soil_moisture || 0))
            );
            const isOptimalMoisture = moisture >= 60 && moisture <= 85;
            const isHarvestSoon = crop.harvest_days_left <= 3;

            return (
              <article
                key={crop.id}
                className="rounded-3xl glass-card-elevated p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-xl"
              >
                {/* Top Header */}
                <div className="flex items-start gap-3">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
                    <img
                      src={getCropImage(crop.crop_name)}
                      alt={crop.crop_name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-on-surface/75 text-white text-[9px] font-bold">
                      {crop.bed_location}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          crop.status.toLowerCase().includes("panen")
                            ? "bg-primary text-on-primary"
                            : crop.status.toLowerCase().includes("pre-order")
                              ? "bg-secondary-container text-on-secondary-container"
                              : "bg-primary-fixed/60 text-on-primary-fixed"
                        }`}
                      >
                        {crop.status}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-mono">
                        #{crop.id}
                      </span>
                    </div>
                    <h3 className="text-[17px] font-bold text-on-surface mt-1 leading-snug">
                      {crop.crop_name}
                    </h3>
                    <p className="text-[12px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px] text-primary">
                        location_on
                      </span>
                      {crop.bed_location}
                    </p>
                  </div>
                </div>

                {/* 2-Column IoT Telemetry Tiles (Kelembapan Tanah & Suhu) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-white/85 shadow-xs border border-white flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant">
                        Kelembapan Tanah
                      </span>
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        humidity_mid
                      </span>
                    </div>
                    <div className="my-1.5">
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-[26px] font-bold text-primary tabular-nums leading-none">
                          {moisture}
                        </span>
                        <span className="text-[14px] font-semibold text-primary">
                          %
                        </span>
                      </div>
                      <div className="w-full bg-surface-container rounded-full h-2 mt-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${moisture}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-primary">
                      {isOptimalMoisture ? "Optimal (60–85%)" : "Perlu Pantau"}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/85 shadow-xs border border-white flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant">
                        Suhu Zona
                      </span>
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        device_thermostat
                      </span>
                    </div>
                    <div className="my-1.5">
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-[26px] font-bold text-on-surface tabular-nums leading-none">
                          {crop.temperature}
                        </span>
                        <span className="text-[14px] font-semibold text-on-surface-variant">
                          °C
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-on-secondary-container mt-2">
                        Sejuk Terkontrol
                      </p>
                    </div>
                    <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] text-primary">
                        tune
                      </span>
                      Cooling mist aktif
                    </span>
                  </div>
                </div>

                {/* Pupuk Organik Card */}
                <div className="p-3 rounded-2xl bg-surface-container-low/75 border border-white/80 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
                      <span className="material-symbols-outlined text-[19px]">
                        compost
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                        Pupuk Organik
                      </span>
                      <p className="text-[13px] font-semibold text-on-surface truncate">
                        {crop.organic_fertilizer}
                      </p>
                      <span className="text-[11px] text-on-surface-variant">
                        Terakhir: {crop.last_fertilized}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-white text-primary text-[10px] font-bold uppercase flex-shrink-0">
                    Subur
                  </span>
                </div>

                {/* Hitung Mundur Panen Banner */}
                <div
                  className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 ${
                    isHarvestSoon
                      ? "bg-primary-container text-on-primary shadow-sm"
                      : "bg-inverse-surface text-inverse-on-surface"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px]">
                        agriculture
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-secondary-fixed block">
                        Hitung Mundur Panen
                      </span>
                      <p className="text-[16px] font-bold tabular-nums truncate">
                        {crop.harvest_days_left} Hari ({countdown.days}h{" "}
                        {countdown.hours}:{countdown.minutes}:{countdown.seconds}
                        )
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/paket"
                    className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold flex-shrink-0 transition-colors"
                  >
                    Pesan
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Katalog Tambahan Siap Petik (Stitch 03_dashboard_iot bottom section) */}
      <section className="flex flex-col gap-3.5 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-bold text-on-surface">
              Katalog Siap Petik Hari Ini
            </h2>
            <p className="text-[12px] text-on-surface-variant">
              Tambahkan panen segar langsung ke keranjang checkout Anda
            </p>
          </div>
          {cartItemCount > 0 && (
            <Link
              href="/paket"
              className="px-3.5 py-1.5 rounded-full bg-primary text-on-primary text-[12px] font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">
                shopping_bag
              </span>
              <span>Checkout ({cartItemCount})</span>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCE_ADDONS.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl glass-card flex flex-col justify-between gap-3"
            >
              <div className="flex gap-3 items-start">
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-on-surface/75 text-white text-[9px] font-semibold">
                    Organik
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-primary text-[10px] font-bold">
                    {item.badge}
                  </span>
                  <h3 className="text-[15px] font-bold text-on-surface truncate mt-1">
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant line-clamp-2">
                    {item.subtitle}
                  </p>
                  <p className="text-[15px] font-bold text-primary mt-1.5 tabular-nums">
                    {formatRupiah(item.price)}{" "}
                    <span className="text-[11px] font-normal text-on-surface-variant">
                      / {item.unitLabel}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">
                    verified
                  </span>
                  Sertifikasi Organik INOFICE
                </span>
                <button
                  type="button"
                  onClick={() => {
                    updateAddonQty(item.id, 1);
                    showToast(`${item.name} ditambahkan ke keranjang!`);
                  }}
                  className="px-3.5 py-2 rounded-full bg-primary text-on-primary text-[12px] font-semibold shadow-sm hover:bg-primary-container active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    add_shopping_cart
                  </span>
                  <span>Petik</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* IoT Scan & Pairing Modal (Stitch 08_iot_scan) */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl glass-card-elevated p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  BLE Mesh &amp; AR QR Finder
                </span>
                <h3 className="text-[18px] font-bold text-on-surface">
                  Pairing Perangkat IoT Kebun
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScannerModal(false)}
                className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <div className="relative rounded-2xl bg-inverse-surface text-on-primary p-3 overflow-hidden">
              <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-on-surface flex items-center justify-center">
                <img
                  src="/images/live-cam.jpg"
                  alt="Scanner IoT"
                  className="absolute inset-0 w-full h-full object-cover opacity-35"
                />
                <div className="relative z-10 w-36 h-24 border-2 border-primary-fixed rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(104,219,169,0.45)]">
                  <span className="material-symbols-outlined text-primary-fixed text-[28px]">
                    qr_code_scanner
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-secondary-fixed mt-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">
                  bluetooth_searching
                </span>
                3 Node sensor terdeteksi di area Greenhouse A
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="manualUuidInput"
                className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Input Manual Kode Sensor (UUID)
              </label>
              <div className="flex gap-2">
                <input
                  id="manualUuidInput"
                  type="text"
                  value={deviceCode}
                  onChange={(e) => setDeviceCode(e.target.value)}
                  placeholder="Contoh: WF-GH04-98F2"
                  className="flex-1 h-11 px-3.5 rounded-xl bg-white text-on-surface text-[13px] shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={handleManualPair}
                  className="h-11 px-4 rounded-xl bg-primary text-on-primary text-[13px] font-semibold cursor-pointer"
                >
                  Verifikasi
                </button>
              </div>
              {pairingSuccess && (
                <p className="text-[12px] text-primary font-semibold">
                  {pairingSuccess}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
