"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { PackageCards } from "@/components/PackageCards";
import { PRODUCE_ADDONS, formatRupiah } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { OrderRecord, PackageItem } from "@/lib/types";

interface PaketCheckoutClientProps {
  packages: PackageItem[];
}

const PAYMENT_BANKS = [
  { id: "BCA", label: "BCA", sub: "Otomatis", va: "8271 0812 9921 0041" },
  { id: "Mandiri", label: "Mandiri", sub: "VA", va: "8902 2019 4418 7720" },
  { id: "BNI/BRI", label: "BNI/BRI", sub: "VA", va: "8808 0815 7710 3312" },
  { id: "QRIS", label: "QRIS", sub: "Instan", va: "ID1020049811204-WF" },
];

export function PaketCheckoutClient({ packages }: PaketCheckoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    profile,
    refreshProfile,
    selectedPackage,
    selectPackage,
    addons,
    updateAddonQty,
    clearOrderCart,
  } = useAuth();

  const [selectedBank, setSelectedBank] = useState("BCA");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<OrderRecord | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [countdownSec, setCountdownSec] = useState(23 * 3600 + 58 * 60 + 35);

  // Pick package from query param if provided
  useEffect(() => {
    const pkgIdParam = searchParams.get("packageId");
    if (pkgIdParam && packages.length > 0) {
      const found = packages.find((p) => String(p.id) === pkgIdParam);
      if (found) selectPackage(found);
    }
  }, [searchParams, packages, selectPackage]);

  // Pre-fill shipping details from user profile
  useEffect(() => {
    if (profile) {
      setRecipientName(profile.full_name || "");
      setRecipientPhone(profile.phone || "");
      setDeliveryAddress(profile.address || "");
    }
  }, [profile]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load user's orders from Supabase
  const loadOrders = async (uid: string) => {
    setLoadingOrders(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("orders")
        .select("id, user_id, package_name, total_price, order_status, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (data) {
        setOrders(data as OrderRecord[]);
      }
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadOrders(user.id);
    } else {
      setOrders([]);
    }
  }, [user?.id]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 2500);
  };

  const addonItems = useMemo(() => {
    return PRODUCE_ADDONS.filter((a) => (addons[a.id] ?? 0) > 0).map((a) => ({
      ...a,
      qty: addons[a.id] ?? 0,
    }));
  }, [addons]);

  const activePkg = selectedPackage ?? packages[0] ?? null;

  const subtotal = useMemo(() => {
    const pkgPrice = selectedPackage ? Number(selectedPackage.price || 0) : 0;
    const addonsPrice = addonItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );
    return pkgPrice + addonsPrice;
  }, [selectedPackage, addonItems]);

  const serviceFee = subtotal > 0 ? 2000 : 0;
  const uniqueCode = subtotal > 0 ? 412 : 0;
  const totalPrice = subtotal + serviceFee + uniqueCode;

  const bankMeta =
    PAYMENT_BANKS.find((b) => b.id === selectedBank) ?? PAYMENT_BANKS[0];

  const countdownFormatted = useMemo(() => {
    const h = Math.floor(countdownSec / 3600);
    const m = Math.floor((countdownSec % 3600) / 60);
    const s = countdownSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(s).padStart(2, "0")}`;
  }, [countdownSec]);

  const handleCopy = (val: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(val);
    }
    showToast(`${val} disalin ke clipboard`);
  };

  const handlePlaceOrder = async () => {
    setErrorMsg(null);
    setSuccessOrder(null);

    if (!user) {
      router.push("/login");
      return;
    }

    const chosenPackage = selectedPackage ?? activePkg;
    if (!chosenPackage && addonItems.length === 0) {
      setErrorMsg("Silakan pilih minimal satu paket atau komoditas panen.");
      return;
    }

    const finalPkgPrice = chosenPackage ? Number(chosenPackage.price || 0) : 0;
    const finalTotal =
      subtotal > 0
        ? totalPrice
        : finalPkgPrice + 2000 + 412;

    const orderSummaryLabel = [
      chosenPackage
        ? `${chosenPackage.package_name} (${chosenPackage.period})`
        : null,
      addonItems.length > 0
        ? `${addonItems.map((a) => `${a.name} x${a.qty}`).join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join(" + ");

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();

      // Ensure profile is synced with updated shipping details & active_package
      if (recipientName || recipientPhone || deliveryAddress || chosenPackage) {
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name:
              recipientName.trim() ||
              profile?.full_name ||
              user.email?.split("@")[0] ||
              "Pelanggan",
            phone: recipientPhone.trim() || profile?.phone || "",
            address: deliveryAddress.trim() || profile?.address || "",
            active_package: chosenPackage
              ? chosenPackage.package_name
              : profile?.active_package ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }

      const { data: insertedOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          package_name: `${orderSummaryLabel} • ${selectedBank}`,
          total_price: finalTotal,
          order_status: "Menunggu Pembayaran",
        })
        .select("id, user_id, package_name, total_price, order_status, created_at")
        .single();

      if (orderError) {
        setErrorMsg(
          orderError.message || "Gagal menyimpan pesanan ke tabel orders."
        );
        return;
      }

      setSuccessOrder(insertedOrder as OrderRecord);
      clearOrderCart();
      await Promise.all([loadOrders(user.id), refreshProfile()]);
      showToast("Pesanan berhasil disimpan ke Supabase!");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal memproses pesanan."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-7 pb-10">
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-inverse-surface text-inverse-on-surface text-[13px] font-semibold shadow-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary-fixed">
            check_circle
          </span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Stepper Header (Stitch 05_checkout) */}
      <section className="glass-card rounded-3xl p-4 md:p-5">
        <div className="flex items-center justify-between relative max-w-xl mx-auto mb-3">
          <div className="absolute left-8 right-8 top-4 h-0.5 bg-surface-container-highest z-0" />
          <div className="absolute left-8 w-1/2 top-4 h-0.5 bg-primary z-0" />

          <div className="flex flex-col items-center relative z-10">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[16px]">
                check
              </span>
            </div>
            <span className="text-[11px] font-bold text-primary mt-1">
              Pilih Paket
            </span>
          </div>

          <div className="flex flex-col items-center relative z-10">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md ring-4 ring-primary-fixed/50">
              <span className="material-symbols-outlined text-[16px]">
                credit_card
              </span>
            </div>
            <span className="text-[11px] font-bold text-primary mt-1">
              Checkout
            </span>
          </div>

          <div className="flex flex-col items-center relative z-10">
            <div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">
                local_shipping
              </span>
            </div>
            <span className="text-[11px] font-semibold text-on-surface-variant mt-1">
              Cold-Chain
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 bg-primary-fixed/35 rounded-2xl px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-[11px] text-on-primary-fixed-variant font-bold">
              Armada Cold-Chain 4°C Siap Antar
            </span>
          </div>
          <span className="text-[11px] text-primary font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">
              verified
            </span>
            Garansi Segar 100%
          </span>
        </div>
      </section>

      {/* Catalog Section from `packages` */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Paket Pembelian WawanFarm
            </span>
            <h1 className="text-[22px] font-bold text-on-surface">
              Pilih Paket Langganan Panen
            </h1>
          </div>
          {selectedPackage && (
            <span className="px-3 py-1 rounded-full bg-primary text-on-primary text-[12px] font-semibold w-fit">
              Dipilih: {selectedPackage.package_name}
            </span>
          )}
        </div>

        <PackageCards
          packages={packages}
          selectedPackageId={selectedPackage?.id ?? null}
          onSelectPackage={(pkg) => {
            selectPackage(pkg);
            showToast(`${pkg.package_name} dipilih untuk checkout`);
          }}
        />
      </section>

      {/* Add-on Komoditas Segar + Checkout Form Split (Mobile 1-col, Tablet/Desktop 2-col) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* Left Column: Selected Package, Fresh Produce Add-ons, Shipping Address */}
        <div className="flex flex-col gap-5">
          {/* Tambahan Komoditas Panen */}
          <div className="glass-card rounded-3xl p-5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  eco
                </span>
                <h2 className="text-[17px] font-bold text-on-surface">
                  Tambahan Sayur Panen Fajar
                </h2>
              </div>
              <span className="text-[11px] font-bold text-primary bg-primary-fixed/40 px-2.5 py-0.5 rounded-full">
                Opsional
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {PRODUCE_ADDONS.map((item) => {
                const qty = addons[item.id] ?? 0;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-white/85 p-3 shadow-xs flex items-center gap-3"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-bold text-on-surface truncate">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-on-surface-variant truncate">
                        {item.unitLabel} • {item.badge}
                      </p>
                      <p className="text-[14px] font-bold text-primary mt-0.5 tabular-nums">
                        {formatRupiah(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-surface-container-low rounded-full px-1.5 py-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => updateAddonQty(item.id, -1)}
                        className="w-7 h-7 rounded-full bg-white text-primary flex items-center justify-center shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          remove
                        </span>
                      </button>
                      <span className="min-w-[18px] text-center text-[13px] font-bold tabular-nums">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateAddonQty(item.id, 1)}
                        className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          add
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alamat & Jadwal Pengiriman */}
          <div className="glass-card rounded-3xl p-5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  local_shipping
                </span>
                <h2 className="text-[17px] font-bold text-on-surface">
                  Alamat &amp; Penerima Pengiriman
                </h2>
              </div>
              {user && (
                <Link
                  href="/profil"
                  className="text-[11px] font-semibold text-primary bg-surface-container-low px-2.5 py-1 rounded-full"
                >
                  Dari Profil
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase text-on-surface-variant">
                  Nama Penerima
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Nama lengkap penerima"
                  className="h-11 px-3.5 rounded-xl bg-white/85 text-[13px] text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase text-on-surface-variant">
                  No. HP / WhatsApp
                </label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="0812xxxx"
                  className="h-11 px-3.5 rounded-xl bg-white/85 text-[13px] text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase text-on-surface-variant">
                Alamat Pengiriman Cold-Chain
              </label>
              <textarea
                rows={2}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Masukkan alamat lengkap pengiriman"
                className="p-3 rounded-xl bg-white/85 text-[13px] text-on-surface shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>

            <div className="rounded-2xl bg-surface-container-low/75 p-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-primary">
                  Slot Panen Fajar
                </p>
                <p className="text-[13px] font-bold text-on-surface">
                  Besok Pagi, 07:30 – 09:00 WIB
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-primary text-on-primary text-[11px] font-bold">
                Suhu 3.8°C
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Method + Summary + Submit to Supabase `orders` */}
        <div className="flex flex-col gap-5">
          {/* Metode Pembayaran */}
          <div className="glass-card rounded-3xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  account_balance
                </span>
                <h2 className="text-[17px] font-bold text-on-surface">
                  Metode Pembayaran
                </h2>
              </div>
              <span className="text-[11px] font-bold text-error bg-error-container/50 px-2.5 py-0.5 rounded-full flex items-center gap-1 tabular-nums">
                <span className="material-symbols-outlined text-[13px]">
                  timer
                </span>
                {countdownFormatted}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_BANKS.map((bank) => {
                const active = selectedBank === bank.id;
                return (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => setSelectedBank(bank.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-[11px] transition-all cursor-pointer ${
                      active
                        ? "bg-primary text-on-primary shadow-sm font-bold"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-medium"
                    }`}
                  >
                    <span className="text-[13px] font-bold">{bank.label}</span>
                    <span className="text-[9px] opacity-85">{bank.sub}</span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-surface-container-low to-surface-container-high/60 p-4 flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Nomor Virtual Account / ID {bankMeta.label}
                  </span>
                  <span className="text-[10px] font-bold text-primary bg-primary-fixed/60 px-2 py-0.5 rounded-full">
                    Verifikasi Otomatis
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/90 px-3 py-2.5 rounded-xl shadow-xs gap-2">
                  <span className="text-[15px] font-bold tracking-wider text-on-surface truncate tabular-nums">
                    {bankMeta.va}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(bankMeta.va.replace(/\s+/g, ""))}
                    className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary-fixed/40 px-2.5 py-1 rounded-lg cursor-pointer flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      content_copy
                    </span>
                    Salin
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Ringkasan Biaya & Tombol Pesan */}
          <div className="glass-card-elevated rounded-3xl p-5 flex flex-col gap-4">
            <h2 className="text-[17px] font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                receipt_long
              </span>
              Ringkasan Pesanan
            </h2>

            {selectedPackage ? (
              <div className="p-3 rounded-2xl bg-primary-fixed/30 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-primary block">
                    Paket Terpilih
                  </span>
                  <p className="text-[14px] font-bold text-on-surface">
                    {selectedPackage.package_name} ({selectedPackage.period})
                  </p>
                </div>
                <span className="text-[15px] font-bold text-primary tabular-nums">
                  {formatRupiah(selectedPackage.price)}
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-surface-container-low/70 text-[12px] text-on-surface-variant">
                Belum ada paket yang dipilih di atas. Pilih salah satu paket
                untuk melanjutkan checkout, atau tambahkan sayur segar.
              </div>
            )}

            {addonItems.length > 0 && (
              <div className="flex flex-col gap-1.5 text-[13px]">
                {addonItems.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between text-on-surface-variant"
                  >
                    <span>
                      {a.name} × {a.qty}
                    </span>
                    <span className="font-semibold text-on-surface tabular-nums">
                      {formatRupiah(a.price * a.qty)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 text-[13px] pt-2 border-t border-primary/10">
              <div className="flex justify-between text-on-surface-variant">
                <span>Subtotal</span>
                <span className="font-semibold text-on-surface tabular-nums">
                  {formatRupiah(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Kurir Cold-Chain 4°C</span>
                <span className="font-bold text-primary">GRATIS</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Biaya Layanan &amp; Donasi Petani</span>
                <span className="font-semibold text-on-surface tabular-nums">
                  {formatRupiah(serviceFee)}
                </span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Kode Unik Verifikasi</span>
                <span className="font-semibold text-primary tabular-nums">
                  +{formatRupiah(uniqueCode)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                <span className="text-[15px] font-bold text-on-surface">
                  Total Pembayaran
                </span>
                <span className="text-[22px] font-bold text-primary tabular-nums">
                  {formatRupiah(totalPrice)}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-error-container/80 text-on-error-container text-[13px] font-medium">
                {errorMsg}
              </div>
            )}

            {successOrder && (
              <div className="p-4 rounded-2xl bg-primary-fixed/50 text-on-primary-fixed text-[13px] flex flex-col gap-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">
                    task_alt
                  </span>
                  Pesanan #{successOrder.id} Berhasil Disimpan!
                </p>
                <p className="text-[12px]">
                  {successOrder.package_name} —{" "}
                  {formatRupiah(successOrder.total_price)} (
                  {successOrder.order_status})
                </p>
              </div>
            )}

            {!user && (
              <div className="p-3 rounded-2xl bg-surface-container-low text-[12px] text-on-surface-variant flex items-center justify-between gap-2">
                <span>Masuk terlebih dahulu untuk menyimpan pesanan Anda.</span>
                <Link
                  href="/login"
                  className="px-3 py-1 rounded-full bg-primary text-on-primary font-bold flex-shrink-0"
                >
                  Masuk
                </Link>
              </div>
            )}

            <button
              type="button"
              disabled={submitting || subtotal === 0}
              onClick={handlePlaceOrder}
              className="w-full h-13 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary text-[15px] font-bold shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {submitting ? "progress_activity" : "shopping_cart_checkout"}
              </span>
              <span>
                {submitting
                  ? "Menyimpan Pesanan..."
                  : user
                    ? `Buat Pesanan • ${formatRupiah(totalPrice)}`
                    : "Masuk untuk Buat Pesanan"}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Riwayat Pesanan & Pelacakan Cold-Chain (Stitch 11_cold_chain + Supabase `orders`) */}
      <section id="tracking" className="flex flex-col gap-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Supabase Orders &amp; Cold-Chain
            </span>
            <h2 className="text-[19px] font-bold text-on-surface">
              Riwayat Pesanan &amp; Pengiriman Anda
            </h2>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => loadOrders(user.id)}
              className="px-3 py-1.5 rounded-full bg-white/80 text-primary text-[12px] font-semibold shadow-xs cursor-pointer"
            >
              Muat Ulang
            </button>
          )}
        </div>

        {!user ? (
          <div className="glass-card rounded-3xl p-6 text-center text-on-surface-variant">
            <p className="text-[14px] font-medium">
              Masuk dengan akun Anda untuk melihat riwayat pesanan tersimpan di
              tabel <code>orders</code>.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 mt-3 px-5 py-2.5 rounded-full bg-primary text-on-primary text-[13px] font-semibold"
            >
              Masuk Akun
            </Link>
          </div>
        ) : loadingOrders ? (
          <div className="glass-card rounded-3xl p-6 text-center text-on-surface-variant text-[13px]">
            Memuat riwayat pesanan...
          </div>
        ) : orders.length === 0 ? (
          <div className="glass-card rounded-3xl p-6 text-center text-on-surface-variant text-[13px]">
            Belum ada pesanan tersimpan. Pilih paket di atas lalu tekan{" "}
            <strong>Buat Pesanan</strong>!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="glass-card rounded-3xl p-5 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-primary">
                      Pesanan #{ord.id}
                    </span>
                    <h3 className="text-[15px] font-bold text-on-surface mt-0.5">
                      {ord.package_name}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed/60 text-on-primary-fixed text-[10px] font-bold flex-shrink-0">
                    {ord.order_status}
                  </span>
                </div>

                <div className="rounded-2xl bg-surface-container-low/75 p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                      Total Tagihan
                    </span>
                    <span className="text-[17px] font-bold text-primary tabular-nums">
                      {formatRupiah(ord.total_price)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                      Cold-Chain
                    </span>
                    <span className="text-[12px] font-semibold text-on-surface">
                      3.8°C Terjaga
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-on-surface-variant">
                  Dibuat:{" "}
                  {new Date(ord.created_at).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
