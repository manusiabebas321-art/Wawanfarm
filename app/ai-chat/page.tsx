"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { formatRupiah } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { ChatMessage, ChatSuggestedOrder } from "@/lib/types";

const QUICK_PROMPTS = [
  {
    icon: "potted_plant",
    text: "Bagaimana kondisi sensor kelembapan & suhu kebun saat ini?",
  },
  {
    icon: "eco",
    text: "Sayur organik apa yang paling cepat panen dan pupuknya apa?",
  },
  {
    icon: "storefront",
    text: "Rekomendasikan paket langganan untuk keluarga dan bantu pemesanan.",
  },
  {
    icon: "shopping_bag",
    text: "Saya mau pesan Paket Langganan Bulanan.",
  },
];

export default function AiChatPage() {
  const router = useRouter();
  const { user, profile, selectPackage } = useAuth();
  const endOfChatRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Halo! Saya WawanAI, asisten agronomi & pemesanan WawanFarm. Saya terhubung langsung ke data sensor IoT kebun dan katalog paket terbaru. Ada yang ingin Anda tanyakan tentang panen hari ini atau ingin dibantu memesan paket?",
      timestamp: "Live IoT",
      suggestedOrder: null,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [previousInteractionId, setPreviousInteractionId] = useState<
    string | null
  >(null);
  const [previousModel, setPreviousModel] = useState<string>("gemini-3.8-flash");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [orderingId, setOrderingId] = useState<string | null>(null);

  useEffect(() => {
    endOfChatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async (textOverride?: string) => {
    const content = (textOverride ?? inputText).trim();
    if (!content || sending) return;

    setErrorBanner(null);
    if (!textOverride) setInputText("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          previousInteractionId,
          previousModel,
          history: nextHistory.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        interactionId?: string | null;
        model?: string;
        suggestedOrder?: ChatSuggestedOrder | null;
        error?: string;
        details?: string;
      };

      if (!res.ok || !data.reply) {
        const msg =
          data.details || data.error || "Gagal menerima jawaban dari Gemini.";
        setErrorBanner(msg);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `Maaf, koneksi AI sedang bermasalah: ${msg}`,
            timestamp: "Error",
          },
        ]);
        return;
      }

      if (data.interactionId) {
        setPreviousInteractionId(data.interactionId);
      }
      if (data.model) {
        setPreviousModel(data.model);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.reply!,
          timestamp: new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          suggestedOrder: data.suggestedOrder ?? null,
        },
      ]);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Koneksi ke server AI gagal.";
      setErrorBanner(msg);
    } finally {
      setSending(false);
    }
  };

  const handleCheckoutRecommended = async (
    order: ChatSuggestedOrder,
    msgId: string
  ) => {
    if (order.packageId) {
      selectPackage({
        id: order.packageId,
        package_name: order.packageName,
        period: order.period || "Langganan",
        price: order.price,
        features: order.reason || "",
      });
    }

    if (!user) {
      router.push(
        order.packageId
          ? `/paket?packageId=${order.packageId}`
          : "/paket"
      );
      return;
    }

    // Also allow 1-tap redirect to pre-filled checkout or direct quick order
    setOrderingId(msgId);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("orders").insert({
        user_id: user.id,
        package_name: `${order.packageName} (${order.period || "Langganan"}) • via WawanAI`,
        total_price: order.price,
        order_status: "Menunggu Pembayaran",
      });

      if (!error) {
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name:
              profile?.full_name || user.email?.split("@")[0] || "Pelanggan",
            phone: profile?.phone ?? "",
            address: profile?.address ?? "",
            active_package: order.packageName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

        setMessages((prev) => [
          ...prev,
          {
            id: `confirm-${Date.now()}`,
            role: "assistant",
            content: `Pesanan **${order.packageName}** (${formatRupiah(
              order.price
            )}) berhasil dibuat melalui WawanAI dan disimpan ke akun Anda! Anda bisa melihat detail pembayaran di halaman Paket & Checkout.`,
            timestamp: "Tersimpan",
          },
        ]);
      } else {
        router.push(
          order.packageId
            ? `/paket?packageId=${order.packageId}`
            : "/paket"
        );
      }
    } finally {
      setOrderingId(null);
    }
  };

  const displayName =
    profile?.full_name || user?.email?.split("@")[0] || "Tamu WawanFarm";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-8 items-start">
      {/* Left/Top CRM Profile Dossier Card (Stitch 04_ai_chat_profile) */}
      <aside className="lg:col-span-4 flex flex-col gap-4">
        <section className="relative overflow-hidden rounded-3xl glass-card-elevated p-5 flex flex-col gap-4">
          <div className="pointer-events-none absolute -right-12 -top-12 w-40 h-40 bg-secondary-fixed/30 rounded-full blur-2xl" />

          <div className="flex items-center justify-between gap-2 relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <img
                  src="/images/avatar.jpg"
                  alt={displayName}
                  className="w-12 h-12 rounded-full object-cover shadow-sm"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-primary-container rounded-full ring-2 ring-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h2 className="text-[16px] font-bold text-on-surface truncate">
                    {displayName}
                  </h2>
                  <span
                    className="material-symbols-outlined text-[15px] text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                </div>
                <span className="inline-block px-2 py-0.5 rounded-full bg-primary-fixed/60 text-on-primary-fixed text-[10px] font-bold uppercase mt-0.5">
                  {profile?.active_package || "Belum Ada Paket"}
                </span>
              </div>
            </div>

            <Link
              href={user ? "/profil" : "/login"}
              aria-label="Kelola Profil"
              className="w-9 h-9 rounded-full bg-surface-container-high/70 text-primary flex items-center justify-center flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[19px]">
                manage_accounts
              </span>
            </Link>
          </div>

          <div className="rounded-2xl bg-surface-container-low/75 p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold uppercase text-on-surface-variant">
                Sumber Data Asisten AI
              </span>
              <span className="font-bold text-primary">Supabase Live</span>
            </div>
            <p className="text-[12px] text-on-surface-variant leading-relaxed">
              Setiap pertanyaan otomatis membaca kondisi sensor terbaru dari{" "}
              <code>crops_iot</code> dan daftar harga dari <code>packages</code>
              .
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/kebun"
              className="p-3 rounded-2xl bg-white/80 hover:bg-white transition-colors flex flex-col items-center text-center gap-1"
            >
              <span className="material-symbols-outlined text-[20px] text-primary">
                sensors
              </span>
              <span className="text-[11px] font-bold text-on-surface">
                Sensor IoT
              </span>
            </Link>
            <Link
              href="/paket"
              className="p-3 rounded-2xl bg-white/80 hover:bg-white transition-colors flex flex-col items-center text-center gap-1"
            >
              <span className="material-symbols-outlined text-[20px] text-primary">
                shopping_bag
              </span>
              <span className="text-[11px] font-bold text-on-surface">
                Checkout Paket
              </span>
            </Link>
          </div>
        </section>
      </aside>

      {/* Main Interactive AI Chat Interface (Stitch 04_ai_chat_profile) */}
      <section className="lg:col-span-8 glass-card-elevated rounded-3xl overflow-hidden flex flex-col min-h-[540px] lg:h-[calc(100vh-140px)]">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-surface-container-low/65 border-b border-white/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary-container flex items-center justify-center text-on-primary shadow-sm flex-shrink-0">
              <span className="material-symbols-outlined text-[22px]">
                psychology_alt
              </span>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-secondary-fixed rounded-full ring-2 ring-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[16px] font-bold text-on-surface truncate">
                  WawanAI Assistant
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-primary-container text-on-primary text-[10px] font-bold">
                  {previousModel}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant truncate">
                Agronomis &amp; Asisten Pemesanan Pintar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high/80 text-primary flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Live Data
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorBanner && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-error-container/80 text-on-error-container text-[12px] font-medium">
            {errorBanner}
          </div>
        )}

        {/* Chat Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div
                key={msg.id}
                className="flex items-start justify-end gap-2.5"
              >
                <div className="flex flex-col items-end max-w-[82%] space-y-1">
                  <div className="rounded-2xl rounded-tr-sm p-3.5 bg-primary text-on-primary shadow-md text-[14px] leading-relaxed">
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-1 px-1 text-[10px] text-on-surface-variant">
                    <span>{msg.timestamp}</span>
                    <span className="material-symbols-outlined text-[13px] text-primary">
                      done_all
                    </span>
                  </div>
                </div>
                <img
                  src="/images/avatar.jpg"
                  alt="User"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow-sm"
                />
              </div>
            ) : (
              <div key={msg.id} className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-xs flex-shrink-0 shadow-sm">
                  🌱
                </div>
                <div className="flex flex-col max-w-[88%] space-y-2">
                  <div className="rounded-2xl rounded-tl-sm p-3.5 bg-surface-container-low/90 text-on-surface shadow-xs text-[14px] leading-relaxed whitespace-pre-line">
                    {msg.content}
                  </div>

                  {/* Frosted Order Confirmation Action Card */}
                  {msg.suggestedOrder && (
                    <div className="rounded-2xl p-4 bg-white/95 backdrop-blur-xl shadow-md border border-primary/15 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-primary-fixed text-primary">
                            <span className="material-symbols-outlined text-[18px]">
                              shopping_bag
                            </span>
                          </span>
                          <span className="text-[13px] font-bold text-on-surface">
                            Rekomendasi Pemesanan
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold">
                          Siap Dipesan
                        </span>
                      </div>

                      <div className="space-y-1 text-[13px]">
                        <p className="font-bold text-on-surface">
                          {msg.suggestedOrder.packageName}{" "}
                          {msg.suggestedOrder.period
                            ? `(${msg.suggestedOrder.period})`
                            : ""}
                        </p>
                        {msg.suggestedOrder.reason && (
                          <p className="text-[12px] text-on-surface-variant">
                            {msg.suggestedOrder.reason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] uppercase font-bold text-on-surface-variant">
                          Harga Paket
                        </span>
                        <span className="text-[18px] font-bold text-primary tabular-nums">
                          {formatRupiah(msg.suggestedOrder.price)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={orderingId === msg.id}
                          onClick={() =>
                            handleCheckoutRecommended(
                              msg.suggestedOrder!,
                              msg.id
                            )
                          }
                          className="py-2.5 px-4 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            check_circle
                          </span>
                          <span>
                            {orderingId === msg.id
                              ? "Memproses..."
                              : user
                                ? "Pesan Langsung"
                                : "Lanjut Checkout"}
                          </span>
                        </button>
                        <Link
                          href={
                            msg.suggestedOrder.packageId
                              ? `/paket?packageId=${msg.suggestedOrder.packageId}`
                              : "/paket"
                          }
                          className="py-2.5 px-4 rounded-full bg-surface-container-high text-primary text-[13px] font-semibold flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            storefront
                          </span>
                          <span>Detail Checkout</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  <span className="text-[10px] text-on-surface-variant px-1">
                    {msg.timestamp} • Terhubung Supabase
                  </span>
                </div>
              </div>
            )
          )}

          {sending && (
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-xs flex-shrink-0">
                🌱
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-surface-container-low text-on-surface-variant text-[13px] flex items-center gap-2">
                <span className="material-symbols-outlined text-[17px] animate-spin text-primary">
                  progress_activity
                </span>
                <span>Membaca sensor IoT &amp; menyiapkan jawaban...</span>
              </div>
            </div>
          )}
          <div ref={endOfChatRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 pt-2 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-white/60">
          {QUICK_PROMPTS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => sendMessage(chip.text)}
              className="whitespace-nowrap px-3.5 py-1.5 rounded-full bg-surface-container-high/75 hover:bg-surface-container-high text-on-surface text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[15px] text-primary">
                {chip.icon}
              </span>
              <span>{chip.text}</span>
            </button>
          ))}
        </div>

        {/* Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-3.5 md:p-4 bg-surface-container-low/80 backdrop-blur-xl flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tanyakan kondisi kebun, jadwal panen, atau pesan paket..."
            className="flex-1 h-11 px-4 rounded-full bg-white/95 text-on-surface placeholder:text-on-surface-variant/70 text-[14px] shadow-inner outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            aria-label="Kirim Pesan"
            className="w-11 h-11 rounded-full bg-primary hover:bg-primary-container text-on-primary flex items-center justify-center shadow-md transition-transform active:scale-90 disabled:opacity-50 cursor-pointer flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>
      </section>
    </div>
  );
}
