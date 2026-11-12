import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { PackageCards } from "@/components/PackageCards";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { CropIot, PackageItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createServerSupabaseClient();

  const [{ data: packagesData }, { data: cropsData }] = await Promise.all([
    supabase.from("packages").select("*").order("price", { ascending: true }),
    supabase.from("crops_iot").select("*").order("id", { ascending: true }),
  ]);

  const packages = (packagesData ?? []) as PackageItem[];
  const crops = (cropsData ?? []) as CropIot[];

  return (
    <div className="flex flex-col space-y-6 lg:space-y-8 pb-6">
      {/* Sub-Header Status Bar & Brand Badge (Stitch 01_landing) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-white/90">
          <BrandLogo size={22} className="rounded-md" />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Smart Agri 4.0
          </span>
        </div>

        <Link
          href="/kebun"
          className="flex items-center gap-1.5 bg-secondary-container/60 backdrop-blur-md px-3 py-1.5 rounded-full text-on-secondary-container hover:bg-secondary-container transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">sensors</span>
          <span className="text-[11px] font-semibold">
            {crops.length || 3} Bedeng IoT Live
          </span>
        </Link>
      </div>

      {/* Hero Section: Mobile 1-col, Tablet & Desktop 2-col split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Hero Visual Card & Value Statement */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-3xl glass-card-elevated p-5 md:p-7 flex flex-col justify-between gap-5">
          <div className="pointer-events-none absolute -top-12 -right-12 w-52 h-52 bg-primary-fixed-dim/40 rounded-full blur-2xl" />

          <div className="flex flex-col gap-3 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed/60 text-on-primary-fixed text-[11px] uppercase font-bold tracking-wide">
                Panen Segar Presisi
              </span>
              <span className="text-[11px] text-on-surface-variant flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-[14px] text-primary">
                  schedule
                </span>
                Real-Time IoT
              </span>
            </div>

            <h1 className="text-[26px] md:text-[32px] lg:text-[36px] text-on-surface font-bold tracking-tight leading-[1.18]">
              Panen Sayur Organik Segar Langsung dari Kebun Pintar.
            </h1>

            <p className="text-[14px] md:text-[15px] text-on-surface-variant leading-relaxed max-w-2xl">
              Teknologi IoT mengawasi nutrisi akar, kelembapan tanah, dan suhu
              tiap detik. Dipetik fajar, tiba di meja makan Anda dalam kondisi
              prima nan renyah.
            </p>
          </div>

          {/* Micro-card Sensor Stats Grid (Stitch 3-Col) */}
          <div className="grid grid-cols-3 gap-2.5 pt-1 z-10">
            <div className="flex flex-col p-3 rounded-2xl bg-white/85 backdrop-blur-md shadow-sm border border-white">
              <div className="flex items-center gap-1 text-primary">
                <span className="material-symbols-outlined text-[16px]">eco</span>
                <span className="text-[11px] font-bold text-on-surface-variant">
                  Organik
                </span>
              </div>
              <span className="text-[24px] md:text-[28px] font-bold text-on-surface mt-1 tabular-nums">
                98%
              </span>
              <span className="text-[10px] font-semibold text-on-surface-variant">
                Kemurnian Lab
              </span>
            </div>

            <div className="flex flex-col p-3 rounded-2xl bg-white/85 backdrop-blur-md shadow-sm border border-white">
              <div className="flex items-center gap-1 text-primary">
                <span className="material-symbols-outlined text-[16px]">
                  verified_user
                </span>
                <span className="text-[11px] font-bold text-on-surface-variant">
                  Residu
                </span>
              </div>
              <span className="text-[24px] md:text-[28px] font-bold text-on-surface mt-1 tabular-nums">
                0%
              </span>
              <span className="text-[10px] font-semibold text-on-surface-variant">
                Bahan Kimiawi
              </span>
            </div>

            <div className="flex flex-col p-3 rounded-2xl bg-white/85 backdrop-blur-md shadow-sm border border-white">
              <div className="flex items-center gap-1 text-primary">
                <span className="material-symbols-outlined text-[16px]">
                  sensors
                </span>
                <span className="text-[11px] font-bold text-on-surface-variant">
                  Greenhouse
                </span>
              </div>
              <span className="text-[24px] md:text-[28px] font-bold text-on-surface mt-1 tabular-nums">
                12
              </span>
              <span className="text-[10px] font-semibold text-on-surface-variant">
                Zona Aktif
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 z-10 pt-1">
            <a
              href="#katalog-paket"
              className="h-11 px-5 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary text-[14px] font-semibold shadow-md shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all inline-flex items-center gap-2"
            >
              <span>Lihat Paket Panen</span>
              <span className="material-symbols-outlined text-[18px]">
                arrow_downward
              </span>
            </a>
            <Link
              href="/kebun"
              className="h-11 px-5 rounded-full bg-white/80 text-primary text-[14px] font-semibold border border-primary/15 hover:bg-white transition-all inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                potted_plant
              </span>
              <span>Pantau Sensor IoT</span>
            </Link>
          </div>
        </div>

        {/* Hero Visual Photo Feature + Fresh Produce Mosaic */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          <div className="relative w-full h-52 lg:flex-1 min-h-[200px] rounded-3xl overflow-hidden shadow-lg">
            <img
              src="/images/hero-greenhouse.jpg"
              alt="Greenhouse hidroponik organik pintar WawanFarm"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/85 via-transparent to-transparent flex items-end p-4">
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-fixed animate-pulse flex-shrink-0" />
                  <span className="text-[13px] text-white font-medium truncate">
                    Panen Pagi: Sedang Dikemas di Zona 03
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-md text-white text-[10px] font-bold flex-shrink-0">
                  Live Cam
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative h-32 rounded-2xl overflow-hidden shadow-sm">
              <img
                src="/images/bokchoy-kale.jpg"
                alt="Bok Choy dan Kale Organik"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-inverse-surface/70 backdrop-blur-md text-inverse-on-surface text-[10px] font-semibold">
                Bok Choy &amp; Kale
              </div>
            </div>
            <div className="relative h-32 rounded-2xl overflow-hidden shadow-sm">
              <img
                src="/images/tomato-carrot.jpg"
                alt="Tomat Ceri dan Baby Carrot Organik"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-inverse-surface/70 backdrop-blur-md text-inverse-on-surface text-[10px] font-semibold">
                Tomat &amp; Baby Carrot
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Cards (1-col Mobile, 2-col Tablet, 3-col Desktop) */}
      <section className="flex flex-col space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[18px] font-bold text-on-surface">
            Mengapa WawanFarm Berbeda?
          </h2>
          <span className="text-[11px] text-primary font-bold uppercase tracking-wider">
            Garansi Mutu
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="flex items-start gap-3.5 p-4 rounded-2xl glass-card">
            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-[22px]">
                sensors
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[16px] text-on-surface font-semibold">
                Transparansi Sensor 24/7
              </span>
              <p className="text-[13px] text-on-surface-variant mt-0.5 leading-relaxed">
                Pantau kelembapan media, suhu, dan pupuk organik pesanan Anda
                lewat stream telemetri real-time.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl glass-card">
            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-[22px]">
                nest_clock_farsight_analog
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[16px] text-on-surface font-semibold">
                Petik Pagi, Sampai Siang
              </span>
              <p className="text-[13px] text-on-surface-variant mt-0.5 leading-relaxed">
                Dipotong tepat jam 05:30 saat klorofil dan kadar air maksimal.
                Tiba sebelum makan siang tiba.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl glass-card md:col-span-2 lg:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-[22px]">
                health_and_safety
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[16px] text-on-surface font-semibold">
                Bebas Rekayasa Kimiawi
              </span>
              <p className="text-[13px] text-on-surface-variant mt-0.5 leading-relaxed">
                100% benih non-GMO dengan pengendalian hayati mikroorganisme
                alami tanpa semprotan beracun.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Subscription Packages Section (LIVE from Supabase `packages`) */}
      <section id="katalog-paket" className="flex flex-col space-y-4 pt-1">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 px-1">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-primary uppercase font-bold tracking-wider">
              Katalog Langganan Panen
            </span>
            <h2 className="text-[22px] text-on-surface font-bold">
              Pilih Ritme Sehat Keluarga Anda
            </h2>
            <p className="text-[13px] text-on-surface-variant">
              Data paket langsung terhubung ke Supabase. Jeda atau ubah jadwal
              pengiriman kapan saja.
            </p>
          </div>
          <Link
            href="/paket"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-primary hover:underline w-fit"
          >
            <span>Buka Halaman Pembelian</span>
            <span className="material-symbols-outlined text-[16px]">
              arrow_forward
            </span>
          </Link>
        </div>

        <PackageCards packages={packages} />
      </section>

      {/* Live Preview Komoditas Kebun IoT + Guarantee & Customer Voice */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
        {/* Guarantee Card */}
        <div className="rounded-3xl bg-surface-container-high/65 backdrop-blur-xl p-5 md:p-6 flex flex-col justify-between gap-4 border border-white/75 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-md flex-shrink-0">
              <span className="material-symbols-outlined text-[26px]">
                verified_user
              </span>
            </div>
            <div className="flex flex-col">
              <h4 className="text-[17px] text-on-surface font-bold">
                100% Garansi Segar Penggantian
              </h4>
              <span className="text-[13px] text-on-surface-variant">
                Sayur layu atau rusak di kurir? Chat via AgriAI, langsung kami
                ganti baru gratis.
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-[11px]">
                  RN
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] text-on-surface font-semibold">
                    dr. Raditya Nugraha
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Pelanggan Paket Langganan Bulanan
                  </span>
                </div>
              </div>
              <div className="flex text-amber-500">
                {[0, 1, 2, 3, 4].map((star) => (
                  <span
                    key={star}
                    className="material-symbols-outlined text-[15px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[13px] text-on-surface italic leading-relaxed">
              &ldquo;Kualitas selada dan bayamnya luar biasa renyah. Sensor
              IoT-nya bukan gimmick, kita bisa cek riwayat nutrisi dan pupuk
              tanaman sendiri sebelum dimasak.&rdquo;
            </p>
          </div>
        </div>

        {/* Live AI Assistant & IoT Quick Gateway */}
        <div className="rounded-3xl glass-card-elevated p-5 md:p-6 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                AgriAI &amp; Live Sensor
              </span>
              <h3 className="text-[18px] font-bold text-on-surface mt-0.5">
                Butuh Rekomendasi Panen Hari Ini?
              </h3>
              <p className="text-[13px] text-on-surface-variant mt-1">
                Tanya asisten AI WawanFarm yang terhubung langsung ke sensor
                kebun &amp; daftar paket terbaru.
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-secondary-container text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[24px]">
                smart_toy
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {crops.slice(0, 2).map((crop) => (
              <div
                key={crop.id}
                className="rounded-2xl bg-surface-container-low/75 p-3 flex flex-col gap-1 border border-white/80"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-primary truncate">
                    {crop.bed_location}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-primary text-[10px] font-bold">
                    {crop.status}
                  </span>
                </div>
                <p className="text-[13px] font-bold text-on-surface truncate">
                  {crop.crop_name}
                </p>
                <p className="text-[11px] text-on-surface-variant tabular-nums">
                  Kelembapan {crop.soil_moisture}% • {crop.temperature}°C •{" "}
                  {crop.harvest_days_left} hari lagi
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href="/ai-chat"
              className="h-11 rounded-full bg-primary text-on-primary text-[13px] font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary-container transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span>Chat WawanAI</span>
            </Link>
            <Link
              href="/login"
              className="h-11 rounded-full bg-surface-container-high text-primary text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-secondary-container transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                login
              </span>
              <span>Masuk Akun</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom Trust Strip */}
      <footer className="flex flex-col items-center justify-center gap-3 pt-2 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 text-on-surface-variant text-[13px]">
          <span>Sudah memiliki langganan aktif?</span>
          <Link href="/login" className="text-primary font-bold hover:underline">
            Masuk Akun
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-on-surface-variant text-[11px] font-semibold">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">
              lock
            </span>
            Pembayaran Aman
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">
              autorenew
            </span>
            Batal Fleksibel
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">
              local_shipping
            </span>
            Cold-Chain Box
          </span>
        </div>
      </footer>
    </div>
  );
}
