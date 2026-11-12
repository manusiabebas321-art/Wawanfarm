"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { getSupabaseBrowserClient } from "@/lib/supabase";

interface AuthScreenProps {
  initialMode?: "login" | "register";
}

export function AuthScreen({ initialMode = "login" }: AuthScreenProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [cropPreference, setCropPreference] = useState("salad");
  const [deliveryRegion, setDeliveryRegion] = useState("jabodetabek");
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Mohon masukkan email dan kata sandi.");
      return;
    }

    if (mode === "register" && password.length < 6) {
      setErrorMsg("Kata sandi minimal 6 karakter.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMsg(error.message || "Email atau kata sandi tidak cocok.");
          return;
        }
        setSuccessMsg("Berhasil masuk! Mengarahkan ke halaman kebun...");
        router.push("/profil");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || email.split("@")[0],
              phone: phone.trim(),
              address: address.trim(),
              crop_preference: cropPreference,
              delivery_region: deliveryRegion,
            },
          },
        });

        if (error) {
          setErrorMsg(error.message || "Gagal mendaftarkan akun baru.");
          return;
        }

        if (data.user && data.session) {
          // Initialize profiles row immediately when session is active
          await supabase.from("profiles").upsert(
            {
              id: data.user.id,
              full_name: fullName.trim() || email.split("@")[0],
              phone: phone.trim(),
              address: address.trim(),
              active_package: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
          setSuccessMsg("Akun organik berhasil dibuat! Mengarahkan ke profil...");
          router.push("/profil");
          router.refresh();
        } else {
          setSuccessMsg(
            "Pendaftaran berhasil! Silakan cek inbox email Anda untuk verifikasi lalu masuk."
          );
          setMode("login");
        }
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan koneksi Supabase."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto py-2 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Brand Showcase Column (Stitch 02_auth) */}
        <section className="glass-card rounded-3xl p-6 md:p-8 flex flex-col items-center md:items-start text-center md:text-left gap-4">
          <div className="relative flex items-center justify-center p-3 rounded-3xl bg-surface-container-low/70 shadow-sm backdrop-blur-md">
            <BrandLogo size={64} />
            <div className="absolute -inset-1 rounded-3xl bg-primary-fixed-dim/25 blur-lg -z-10" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/75 text-on-secondary-container text-[11px] font-bold tracking-wider uppercase shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            Precision Organic Ecosystem
          </span>

          <h1 className="text-[22px] md:text-[26px] font-bold text-on-surface leading-tight">
            Gerbang Komunitas Petani &amp; Pelanggan WawanFarm
          </h1>

          <p className="text-[13px] md:text-[14px] text-on-surface-variant leading-relaxed">
            Masuk untuk memesan paket panen organik, memantau sensor IoT
            greenhouse secara realtime, dan menyimpan alamat pengiriman cold-chain
            Anda.
          </p>

          <div className="w-full rounded-2xl bg-surface-container-low/70 p-4 flex flex-col gap-2 text-left border border-white/80">
            <div className="flex items-center gap-2 text-primary font-bold text-[12px]">
              <span className="material-symbols-outlined text-[17px]">
                verified
              </span>
              <span>Enkripsi 256-Bit Supabase Auth</span>
            </div>
            <p className="text-[12px] text-on-surface-variant">
              Riwayat pesanan, paket langganan aktif, dan pengaturan alamat
              tersimpan aman di akun Anda.
            </p>
          </div>
        </section>

        {/* Auth Form Card Column */}
        <section className="flex flex-col gap-4">
          {/* iOS-Style Segmented Tab Switcher */}
          <div className="relative w-full p-1 rounded-full bg-surface-container-high/65 backdrop-blur-xl shadow-inner flex items-center">
            <div
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-md transition-transform duration-300 ease-out"
              style={{
                transform:
                  mode === "login" ? "translateX(0%)" : "translateX(100%)",
              }}
            />
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg(null);
              }}
              className={`relative z-10 flex-1 py-2.5 text-[14px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === "login" ? "text-primary" : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                lock_open
              </span>
              <span>Masuk Akun</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMsg(null);
              }}
              className={`relative z-10 flex-1 py-2.5 text-[14px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === "register" ? "text-primary" : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                person_add
              </span>
              <span>Daftar Baru</span>
            </button>
          </div>

          {/* Glassmorphic Auth Card */}
          <div className="relative w-full rounded-3xl glass-card-elevated p-5 md:p-6 overflow-hidden">
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-secondary-fixed/30 rounded-full blur-2xl pointer-events-none" />

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 relative z-10"
            >
              {errorMsg && (
                <div className="p-3 rounded-2xl bg-error-container/80 text-on-error-container text-[13px] font-medium flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] flex-shrink-0">
                    error
                  </span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-2xl bg-primary-fixed/60 text-on-primary-fixed text-[13px] font-medium flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] flex-shrink-0">
                    check_circle
                  </span>
                  <span>{successMsg}</span>
                </div>
              )}

              {mode === "register" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="fullNameInput"
                      className="text-[12px] font-semibold text-on-surface-variant"
                    >
                      Nama Lengkap
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">
                        badge
                      </span>
                      <input
                        id="fullNameInput"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Contoh: Dewi Lestari"
                        required
                        className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/85 text-on-surface placeholder:text-outline text-[14px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="phoneInput"
                        className="text-[12px] font-semibold text-on-surface-variant"
                      >
                        Nomor HP / WhatsApp
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">
                          call
                        </span>
                        <input
                          id="phoneInput"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0812xxxx"
                          className="w-full h-12 pl-11 pr-3 rounded-xl bg-white/85 text-on-surface placeholder:text-outline text-[14px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="deliveryRegion"
                        className="text-[12px] font-semibold text-on-surface-variant"
                      >
                        Hub Pengiriman
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">
                          location_on
                        </span>
                        <select
                          id="deliveryRegion"
                          value={deliveryRegion}
                          onChange={(e) => setDeliveryRegion(e.target.value)}
                          className="w-full h-12 pl-11 pr-8 rounded-xl bg-white/85 text-on-surface text-[13px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
                        >
                          <option value="jabodetabek">Jabodetabek</option>
                          <option value="bandung">Bandung &amp; Lembang</option>
                          <option value="surabaya">Surabaya &amp; Malang</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="addressInput"
                      className="text-[12px] font-semibold text-on-surface-variant"
                    >
                      Alamat Pengiriman Utama
                    </label>
                    <textarea
                      id="addressInput"
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Jl. Contoh No. 12, Kecamatan, Kota"
                      className="w-full p-3 rounded-xl bg-white/85 text-on-surface placeholder:text-outline text-[14px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                    />
                  </div>
                </>
              )}

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="emailInput"
                  className="text-[12px] font-semibold text-on-surface-variant flex items-center justify-between"
                >
                  <span>Alamat Email</span>
                  <span className="text-[10px] text-primary font-semibold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px]">
                      verified_user
                    </span>
                    Supabase Auth
                  </span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">
                    alternate_email
                  </span>
                  <input
                    id="emailInput"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    required
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/85 text-on-surface placeholder:text-outline text-[14px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="passwordInput"
                  className="text-[12px] font-semibold text-on-surface-variant"
                >
                  Kata Sandi
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">
                    key
                  </span>
                  <input
                    id="passwordInput"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter aman"
                    required
                    className="w-full h-12 pl-11 pr-11 rounded-xl bg-white/85 text-on-surface placeholder:text-outline text-[14px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    aria-label="Toggle Password Visibility"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 text-on-surface-variant hover:text-primary p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Register Crop Preference (Stitch) */}
              {mode === "register" && (
                <div className="flex flex-col gap-2 pt-1">
                  <span className="text-[12px] font-semibold text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      eco
                    </span>
                    Preferensi Panen Keluarga
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      {
                        value: "salad",
                        label: "Sayur Salad & Greens",
                        desc: "Selada Romaine, Kale, Bayam Brazil",
                        icon: "nutrition",
                      },
                      {
                        value: "herbal",
                        label: "Herbal & Rempah Alami",
                        desc: "Mint, Rosemary, Jahe Merah",
                        icon: "spa",
                      },
                      {
                        value: "soup",
                        label: "Sayur Sup & Buah Kebun",
                        desc: "Tomat Ceri, Wortel, Brokoli",
                        icon: "soup_kitchen",
                      },
                    ].map((opt) => {
                      const active = cropPreference === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCropPreference(opt.value)}
                          className={`flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                            active
                              ? "bg-primary-fixed/40 ring-1 ring-primary"
                              : "bg-surface-container-low/60 hover:bg-surface-container-low"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              active
                                ? "bg-primary text-on-primary"
                                : "bg-surface-container-highest/80 text-primary"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {opt.icon}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-on-surface leading-tight">
                              {opt.label}
                            </p>
                            <p className="text-[11px] text-on-surface-variant truncate">
                              {opt.desc}
                            </p>
                          </div>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[13px] ${
                              active
                                ? "bg-primary text-on-primary"
                                : "bg-surface-container-highest text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 mt-1 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary text-[15px] font-semibold shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {submitting ? "progress_activity" : "potted_plant"}
                </span>
                <span>
                  {submitting
                    ? "Memproses..."
                    : mode === "login"
                      ? "Masuk ke Kebun Saya"
                      : "Buat Akun Organik Baru"}
                </span>
              </button>

              <div className="flex items-center justify-between text-[12px] text-on-surface-variant pt-1">
                <span>
                  {mode === "login"
                    ? "Belum punya akun WawanFarm?"
                    : "Sudah punya akun?"}
                </span>
                <Link
                  href={mode === "login" ? "/register" : "/login"}
                  onClick={(e) => {
                    e.preventDefault();
                    setMode(mode === "login" ? "register" : "login");
                    setErrorMsg(null);
                  }}
                  className="text-primary font-bold hover:underline"
                >
                  {mode === "login" ? "Daftar Sekarang" : "Masuk di Sini"}
                </Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
